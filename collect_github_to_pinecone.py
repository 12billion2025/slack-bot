#!/usr/bin/env python3
"""
GitHub 레포지토리의 코드를 임베딩하여 Pinecone에 저장하는 스크립트
"""

import os
import sys
import json
import hashlib
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
import requests
import base64
from datetime import datetime

# 필요한 라이브러리 import
try:
    import openai
    from pinecone import Pinecone, ServerlessSpec
    import tiktoken
except ImportError as e:
    print(f"필요한 라이브러리가 설치되지 않았습니다: {e}")
    print("다음 명령어로 설치해주세요:")
    print("pip install openai pinecone-client tiktoken requests")
    sys.exit(1)

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('github_embedding.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class GitHubCodeEmbedder:
    def __init__(self):
        """GitHub 코드 임베딩 클래스 초기화"""
        self.setup_clients()
        self.setup_config()
        
    def setup_clients(self):
        """OpenAI와 Pinecone 클라이언트 설정"""
        # 환경변수 확인
        required_env_vars = [
            'OPENAI_API_KEY',
            'PINECONE_API_KEY',
            'GITHUB_TOKEN'
        ]
        
        for var in required_env_vars:
            if not os.getenv(var):
                raise ValueError(f"환경변수 {var}가 설정되지 않았습니다.")
        
        # OpenAI 클라이언트 설정
        self.openai_client = openai.OpenAI(
            api_key=os.getenv('OPENAI_API_KEY'),
            base_url=os.getenv('OPENAI_BASE_URL')
        )
        
        # Pinecone 클라이언트 설정
        self.pinecone_client = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))
        
        # GitHub 토큰
        self.github_token = os.getenv('GITHUB_TOKEN')
        
    def setup_config(self):
        """설정 값들 초기화"""
        self.embedding_model = os.getenv('OPENAI_EMBEDDING_MODEL', 'text-embedding-004')
        self.index_name = 'github-code-embeddings'
        self.dimension = 768  # text-embedding-004의 차원
        self.chunk_size = 1000  # 토큰 단위
        self.overlap_size = 200  # 오버랩 토큰 수
        
        # 지원하는 파일 확장자
        self.supported_extensions = {
            '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.h',
            '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
            '.html', '.css', '.scss', '.less', '.vue', '.svelte',
            '.md', '.txt', '.json', '.yaml', '.yml', '.xml', '.sql',
            '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd'
        }
        
        # 제외할 디렉토리
        self.excluded_dirs = {
            'node_modules', '.git', '.vscode', '.idea', '__pycache__',
            'venv', 'env', '.env', 'dist', 'build', 'target', 'bin',
            '.next', '.nuxt', 'coverage', '.nyc_output'
        }
        
    def setup_pinecone_index(self):
        """Pinecone 인덱스 설정"""
        try:
            # 기존 인덱스 확인
            existing_indexes = [index.name for index in self.pinecone_client.list_indexes()]
            
            if self.index_name not in existing_indexes:
                logger.info(f"새로운 Pinecone 인덱스 생성: {self.index_name}")
                self.pinecone_client.create_index(
                    name=self.index_name,
                    dimension=self.dimension,
                    metric='cosine',
                    spec=ServerlessSpec(
                        cloud='aws',
                        region='us-east-1'
                    )
                )
            else:
                logger.info(f"기존 Pinecone 인덱스 사용: {self.index_name}")
                
            self.index = self.pinecone_client.Index(self.index_name)
            
        except Exception as e:
            logger.error(f"Pinecone 인덱스 설정 실패: {e}")
            raise
            
    def get_github_repo_contents(self, repo_url: str) -> List[Dict[str, Any]]:
        """GitHub 레포지토리의 파일 목록을 가져옵니다."""
        # URL에서 owner/repo 추출
        if repo_url.startswith('https://github.com/'):
            repo_path = repo_url.replace('https://github.com/', '')
        else:
            repo_path = repo_url
            
        owner, repo = repo_path.split('/')
        
        headers = {
            'Authorization': f'token {self.github_token}',
            'Accept': 'application/vnd.github.v3+json'
        }
        
        all_files = []
        
        def get_contents(path=''):
            """재귀적으로 모든 파일을 가져옵니다."""
            url = f'https://api.github.com/repos/{owner}/{repo}/contents/{path}'
            
            try:
                response = requests.get(url, headers=headers)
                response.raise_for_status()
                contents = response.json()
                
                for item in contents:
                    if item['type'] == 'file':
                        # 지원하는 파일 확장자인지 확인
                        file_ext = Path(item['name']).suffix.lower()
                        if file_ext in self.supported_extensions:
                            all_files.append(item)
                    elif item['type'] == 'dir':
                        # 제외할 디렉토리가 아닌 경우 재귀 호출
                        if item['name'] not in self.excluded_dirs:
                            get_contents(item['path'])
                            
            except requests.exceptions.RequestException as e:
                logger.error(f"GitHub API 요청 실패 ({path}): {e}")
                
        get_contents()
        logger.info(f"총 {len(all_files)}개의 파일을 발견했습니다.")
        return all_files
        
    def get_file_content(self, file_info: Dict[str, Any]) -> Optional[str]:
        """GitHub에서 파일 내용을 가져옵니다."""
        try:
            headers = {
                'Authorization': f'token {self.github_token}',
                'Accept': 'application/vnd.github.v3+json'
            }
            
            response = requests.get(file_info['url'], headers=headers)
            response.raise_for_status()
            
            file_data = response.json()
            
            if file_data.get('encoding') == 'base64':
                content = base64.b64decode(file_data['content']).decode('utf-8')
                return content
            else:
                return file_data.get('content', '')
                
        except Exception as e:
            logger.error(f"파일 내용 가져오기 실패 ({file_info['path']}): {e}")
            return None
            
    def count_tokens(self, text: str) -> int:
        """텍스트의 토큰 수를 계산합니다."""
        try:
            encoding = tiktoken.encoding_for_model("gpt-4")
            return len(encoding.encode(text))
        except Exception:
            # 대략적인 토큰 수 계산 (1토큰 ≈ 4글자)
            return len(text) // 4
            
    def chunk_text(self, text: str, file_path: str) -> List[Dict[str, Any]]:
        """텍스트를 청크로 나눕니다."""
        chunks = []
        lines = text.split('\n')
        current_chunk = []
        current_tokens = 0
        
        for i, line in enumerate(lines):
            line_tokens = self.count_tokens(line)
            
            if current_tokens + line_tokens > self.chunk_size and current_chunk:
                # 현재 청크 저장
                chunk_text = '\n'.join(current_chunk)
                chunks.append({
                    'text': chunk_text,
                    'start_line': i - len(current_chunk) + 1,
                    'end_line': i,
                    'file_path': file_path
                })
                
                # 오버랩을 위해 마지막 몇 줄 유지
                overlap_lines = []
                overlap_tokens = 0
                for j in range(len(current_chunk) - 1, -1, -1):
                    line_tokens = self.count_tokens(current_chunk[j])
                    if overlap_tokens + line_tokens <= self.overlap_size:
                        overlap_lines.insert(0, current_chunk[j])
                        overlap_tokens += line_tokens
                    else:
                        break
                        
                current_chunk = overlap_lines + [line]
                current_tokens = overlap_tokens + line_tokens
            else:
                current_chunk.append(line)
                current_tokens += line_tokens
                
        # 마지막 청크 처리
        if current_chunk:
            chunk_text = '\n'.join(current_chunk)
            chunks.append({
                'text': chunk_text,
                'start_line': len(lines) - len(current_chunk) + 1,
                'end_line': len(lines),
                'file_path': file_path
            })
            
        return chunks
        
    def create_embedding(self, text: str) -> List[float]:
        """텍스트의 임베딩을 생성합니다."""
        try:
            response = self.openai_client.embeddings.create(
                model=self.embedding_model,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"임베딩 생성 실패: {e}")
            raise
            
    def create_chunk_id(self, file_path: str, start_line: int, end_line: int) -> str:
        """청크의 고유 ID를 생성합니다."""
        content = f"{file_path}:{start_line}:{end_line}"
        return hashlib.md5(content.encode()).hexdigest()
        
    def process_repository(self, repo_url: str):
        """레포지토리 전체를 처리합니다."""
        logger.info(f"레포지토리 처리 시작: {repo_url}")
        
        # Pinecone 인덱스 설정
        self.setup_pinecone_index()
        
        # GitHub 레포지토리 파일 목록 가져오기
        files = self.get_github_repo_contents(repo_url)
        
        total_chunks = 0
        processed_files = 0
        
        for file_info in files:
            try:
                logger.info(f"파일 처리 중: {file_info['path']}")
                
                # 파일 내용 가져오기
                content = self.get_file_content(file_info)
                if not content:
                    continue
                    
                # 텍스트를 청크로 나누기
                chunks = self.chunk_text(content, file_info['path'])
                
                # 각 청크에 대해 임베딩 생성 및 저장
                vectors_to_upsert = []
                
                for chunk in chunks:
                    try:
                        # 임베딩 생성
                        embedding = self.create_embedding(chunk['text'])
                        
                        # 메타데이터 생성
                        chunk_id = self.create_chunk_id(
                            chunk['file_path'], 
                            chunk['start_line'], 
                            chunk['end_line']
                        )
                        
                        metadata = {
                            'file_path': chunk['file_path'],
                            'start_line': chunk['start_line'],
                            'end_line': chunk['end_line'],
                            'file_size': file_info['size'],
                            'file_url': file_info['html_url'],
                            'repository': repo_url,
                            'pageContent': chunk['text'],  # 전체 청크 내용을 pageContent에 저장
                            'timestamp': datetime.now().isoformat()
                        }
                        
                        vectors_to_upsert.append({
                            'id': chunk_id,
                            'values': embedding,
                            'metadata': metadata
                        })
                        
                    except Exception as e:
                        logger.error(f"청크 처리 실패 ({chunk['file_path']}:{chunk['start_line']}): {e}")
                        continue
                
                # Pinecone에 벡터 업로드 (배치 처리)
                if vectors_to_upsert:
                    try:
                        self.index.upsert(vectors=vectors_to_upsert)
                        total_chunks += len(vectors_to_upsert)
                        logger.info(f"파일 {file_info['path']}: {len(vectors_to_upsert)}개 청크 업로드 완료")
                    except Exception as e:
                        logger.error(f"Pinecone 업로드 실패 ({file_info['path']}): {e}")
                        
                processed_files += 1
                
            except Exception as e:
                logger.error(f"파일 처리 실패 ({file_info['path']}): {e}")
                continue
                
        logger.info(f"처리 완료: {processed_files}개 파일, {total_chunks}개 청크")
        
    def search_similar_code(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """유사한 코드를 검색합니다."""
        try:
            # 쿼리 임베딩 생성
            query_embedding = self.create_embedding(query)
            
            # Pinecone에서 검색
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True
            )
            
            return results.matches
            
        except Exception as e:
            logger.error(f"코드 검색 실패: {e}")
            return []

def main():
    """메인 함수"""
    repo_url = "https://github.com/abjin/2025_DKU_OpenSourceAnalysis"
    
    try:
        embedder = GitHubCodeEmbedder()
        embedder.process_repository(repo_url)
        
        print("\n=== 처리 완료 ===")
        print(f"레포지토리: {repo_url}")
        print(f"임베딩 모델: {embedder.embedding_model}")
        print(f"Pinecone 인덱스: {embedder.index_name}")
        
        # 테스트 검색
        print("\n=== 테스트 검색 ===")
        test_query = "function to handle user authentication"
        results = embedder.search_similar_code(test_query, top_k=3)
        
        for i, match in enumerate(results, 1):
            print(f"\n{i}. 파일: {match.metadata['file_path']}")
            print(f"   유사도: {match.score:.4f}")
            print(f"   라인: {match.metadata['start_line']}-{match.metadata['end_line']}")
            print(f"   내용: {match.metadata['pageContent'][:200]}...")
            
    except Exception as e:
        logger.error(f"스크립트 실행 실패: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 