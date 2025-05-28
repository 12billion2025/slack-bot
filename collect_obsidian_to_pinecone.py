#!/usr/bin/env python3
"""
Obsidian 노트 파일들을 임베딩하여 Pinecone에 저장하는 스크립트
"""

import os
import sys
import json
import hashlib
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime
import re

# 필요한 라이브러리 import
try:
    import openai
    from pinecone import Pinecone, ServerlessSpec
    import tiktoken
except ImportError as e:
    print(f"필요한 라이브러리가 설치되지 않았습니다: {e}")
    print("다음 명령어로 설치해주세요:")
    print("pip install openai pinecone-client tiktoken")
    sys.exit(1)

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('obsidian_embedding.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ObsidianEmbedder:
    def __init__(self):
        """Obsidian 노트 임베딩 클래스 초기화"""
        self.setup_clients()
        self.setup_config()
        
    def setup_clients(self):
        """OpenAI와 Pinecone 클라이언트 설정"""
        # 환경변수 확인
        required_env_vars = [
            'OPENAI_API_KEY',
            'PINECONE_API_KEY'
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
        
    def setup_config(self):
        """설정 값들 초기화"""
        self.embedding_model = os.getenv('OPENAI_EMBEDDING_MODEL', 'text-embedding-004')
        self.index_name = 'notion-notes-embeddings'
        self.dimension = 768  # text-embedding-004의 차원
        self.chunk_size = 1000  # 토큰 단위
        self.overlap_size = 200  # 오버랩 토큰 수
        
        # 지원하는 파일 확장자
        self.supported_extensions = {
            '.md', '.txt', '.markdown'
        }
        
        # 제외할 디렉토리 및 파일
        self.excluded_dirs = {
            '.obsidian', '.trash', '.git', '__pycache__', 'node_modules'
        }
        
        self.excluded_files = {
            '.DS_Store', 'Thumbs.db', '.gitignore'
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
            
    def get_obsidian_files(self, vault_path: str) -> List[Path]:
        """Obsidian 볼트에서 모든 노트 파일을 가져옵니다."""
        vault_path = Path(vault_path)
        
        if not vault_path.exists():
            raise ValueError(f"지정된 경로가 존재하지 않습니다: {vault_path}")
            
        all_files = []
        
        def scan_directory(directory: Path):
            """재귀적으로 모든 파일을 스캔합니다."""
            try:
                for item in directory.iterdir():
                    if item.is_file():
                        # 지원하는 파일 확장자인지 확인
                        if (item.suffix.lower() in self.supported_extensions and 
                            item.name not in self.excluded_files):
                            all_files.append(item)
                    elif item.is_dir():
                        # 제외할 디렉토리가 아닌 경우 재귀 호출
                        if item.name not in self.excluded_dirs:
                            scan_directory(item)
            except PermissionError:
                logger.warning(f"권한 없음: {directory}")
                
        scan_directory(vault_path)
        logger.info(f"총 {len(all_files)}개의 파일을 발견했습니다.")
        return all_files
        
    def read_file_content(self, file_path: Path) -> Optional[str]:
        """파일 내용을 읽습니다."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return content
        except UnicodeDecodeError:
            try:
                # UTF-8로 읽기 실패시 다른 인코딩 시도
                with open(file_path, 'r', encoding='cp949') as f:
                    content = f.read()
                return content
            except Exception as e:
                logger.error(f"파일 읽기 실패 ({file_path}): {e}")
                return None
        except Exception as e:
            logger.error(f"파일 읽기 실패 ({file_path}): {e}")
            return None
            
    def extract_metadata(self, content: str, file_path: Path) -> Dict[str, Any]:
        """마크다운 파일에서 메타데이터를 추출합니다."""
        metadata = {
            'title': file_path.stem,
            'file_path': str(file_path),
            'file_name': file_path.name,
            'tags': [],
            'created_date': None,
            'modified_date': None
        }
        
        # 파일 시스템 메타데이터
        try:
            stat = file_path.stat()
            metadata['created_date'] = datetime.fromtimestamp(stat.st_ctime).isoformat()
            metadata['modified_date'] = datetime.fromtimestamp(stat.st_mtime).isoformat()
        except Exception:
            pass
            
        # YAML frontmatter 파싱
        if content.startswith('---'):
            try:
                end_idx = content.find('---', 3)
                if end_idx != -1:
                    frontmatter = content[3:end_idx].strip()
                    for line in frontmatter.split('\n'):
                        if ':' in line:
                            key, value = line.split(':', 1)
                            key = key.strip()
                            value = value.strip().strip('"\'')
                            
                            if key.lower() in ['title', 'name']:
                                metadata['title'] = value
                            elif key.lower() in ['tags', 'tag']:
                                if value.startswith('[') and value.endswith(']'):
                                    # 배열 형태의 태그
                                    tags = [tag.strip().strip('"\'') for tag in value[1:-1].split(',')]
                                    metadata['tags'].extend(tags)
                                else:
                                    # 단일 태그
                                    metadata['tags'].append(value)
            except Exception as e:
                logger.warning(f"Frontmatter 파싱 실패 ({file_path}): {e}")
        
        # 본문에서 태그 추출 (#태그 형태)
        tag_pattern = r'#([a-zA-Z가-힣0-9_-]+)'
        found_tags = re.findall(tag_pattern, content)
        metadata['tags'].extend(found_tags)
        
        # 중복 제거
        metadata['tags'] = list(set(metadata['tags']))
        
        return metadata
        
    def clean_content(self, content: str) -> str:
        """마크다운 내용을 정리합니다."""
        # YAML frontmatter 제거
        if content.startswith('---'):
            end_idx = content.find('---', 3)
            if end_idx != -1:
                content = content[end_idx + 3:].strip()
        
        # 마크다운 링크를 텍스트로 변환
        content = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', content)
        
        # 이미지 링크 제거
        content = re.sub(r'!\[([^\]]*)\]\([^\)]+\)', r'\1', content)
        
        # 마크다운 문법 정리
        content = re.sub(r'#{1,6}\s*', '', content)  # 헤더 마크 제거
        content = re.sub(r'\*\*([^*]+)\*\*', r'\1', content)  # 볼드 제거
        content = re.sub(r'\*([^*]+)\*', r'\1', content)  # 이탤릭 제거
        content = re.sub(r'`([^`]+)`', r'\1', content)  # 인라인 코드 제거
        
        # 여러 줄바꿈을 하나로
        content = re.sub(r'\n\s*\n', '\n\n', content)
        
        return content.strip()
        
    def count_tokens(self, text: str) -> int:
        """텍스트의 토큰 수를 계산합니다."""
        try:
            encoding = tiktoken.encoding_for_model("gpt-4")
            return len(encoding.encode(text))
        except Exception:
            # 대략적인 토큰 수 계산 (1토큰 ≈ 4글자)
            return len(text) // 4
            
    def chunk_text(self, text: str, file_path: Path) -> List[Dict[str, Any]]:
        """텍스트를 청크로 나눕니다."""
        chunks = []
        
        # 문단 단위로 먼저 분할
        paragraphs = text.split('\n\n')
        current_chunk = []
        current_tokens = 0
        
        for i, paragraph in enumerate(paragraphs):
            paragraph = paragraph.strip()
            if not paragraph:
                continue
                
            paragraph_tokens = self.count_tokens(paragraph)
            
            # 현재 청크에 추가할 수 있는지 확인
            if current_tokens + paragraph_tokens <= self.chunk_size:
                current_chunk.append(paragraph)
                current_tokens += paragraph_tokens
            else:
                # 현재 청크 저장
                if current_chunk:
                    chunk_text = '\n\n'.join(current_chunk)
                    chunks.append({
                        'text': chunk_text,
                        'start_paragraph': len(chunks),
                        'end_paragraph': len(chunks),
                        'token_count': current_tokens
                    })
                
                # 새 청크 시작
                if paragraph_tokens <= self.chunk_size:
                    current_chunk = [paragraph]
                    current_tokens = paragraph_tokens
                else:
                    # 문단이 너무 큰 경우 문장 단위로 분할
                    sentences = paragraph.split('. ')
                    temp_chunk = []
                    temp_tokens = 0
                    
                    for sentence in sentences:
                        sentence_tokens = self.count_tokens(sentence)
                        if temp_tokens + sentence_tokens <= self.chunk_size:
                            temp_chunk.append(sentence)
                            temp_tokens += sentence_tokens
                        else:
                            if temp_chunk:
                                chunk_text = '. '.join(temp_chunk)
                                chunks.append({
                                    'text': chunk_text,
                                    'start_paragraph': len(chunks),
                                    'end_paragraph': len(chunks),
                                    'token_count': temp_tokens
                                })
                            temp_chunk = [sentence]
                            temp_tokens = sentence_tokens
                    
                    if temp_chunk:
                        current_chunk = temp_chunk
                        current_tokens = temp_tokens
                    else:
                        current_chunk = []
                        current_tokens = 0
        
        # 마지막 청크 저장
        if current_chunk:
            chunk_text = '\n\n'.join(current_chunk)
            chunks.append({
                'text': chunk_text,
                'start_paragraph': len(chunks),
                'end_paragraph': len(chunks),
                'token_count': current_tokens
            })
        
        logger.info(f"{file_path.name}: {len(chunks)}개 청크로 분할")
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
            
    def create_chunk_id(self, file_path: Path, chunk_index: int) -> str:
        """청크의 고유 ID를 생성합니다."""
        content = f"{file_path}_{chunk_index}"
        return hashlib.md5(content.encode()).hexdigest()
        
    def process_vault(self, vault_path: str):
        """Obsidian 볼트를 처리합니다."""
        logger.info(f"Obsidian 볼트 처리 시작: {vault_path}")
        
        # Pinecone 인덱스 설정
        self.setup_pinecone_index()
        
        # 파일 목록 가져오기
        files = self.get_obsidian_files(vault_path)
        
        total_chunks = 0
        processed_files = 0
        
        for file_path in files:
            try:
                logger.info(f"처리 중: {file_path}")
                
                # 파일 내용 읽기
                content = self.read_file_content(file_path)
                if not content:
                    continue
                
                # 메타데이터 추출
                metadata = self.extract_metadata(content, file_path)
                
                # 내용 정리
                cleaned_content = self.clean_content(content)
                
                if not cleaned_content.strip():
                    logger.warning(f"빈 파일 건너뛰기: {file_path}")
                    continue
                
                # 텍스트 청킹
                chunks = self.chunk_text(cleaned_content, file_path)
                
                # 각 청크에 대해 임베딩 생성 및 저장
                vectors_to_upsert = []
                
                for i, chunk in enumerate(chunks):
                    try:
                        # 임베딩 생성
                        embedding = self.create_embedding(chunk['text'])
                        
                        # 청크 ID 생성
                        chunk_id = self.create_chunk_id(file_path, i)
                        
                        # 메타데이터 준비
                        chunk_metadata = {
                            **metadata,
                            'chunk_index': i,
                            'total_chunks': len(chunks),
                            'token_count': chunk['token_count'],
                            'content_type': 'obsidian_note',
                            'pageContent': chunk['text']  # 전체 청크 내용을 pageContent에 저장
                        }
                        
                        vectors_to_upsert.append({
                            'id': chunk_id,
                            'values': embedding,
                            'metadata': chunk_metadata
                        })
                        
                    except Exception as e:
                        logger.error(f"청크 처리 실패 ({file_path}, chunk {i}): {e}")
                        continue
                
                # Pinecone에 벡터 업로드 (배치 처리)
                if vectors_to_upsert:
                    try:
                        self.index.upsert(vectors=vectors_to_upsert)
                        total_chunks += len(vectors_to_upsert)
                        logger.info(f"{file_path.name}: {len(vectors_to_upsert)}개 청크 업로드 완료")
                    except Exception as e:
                        logger.error(f"Pinecone 업로드 실패 ({file_path}): {e}")
                        continue
                
                processed_files += 1
                
            except Exception as e:
                logger.error(f"파일 처리 실패 ({file_path}): {e}")
                continue
        
        logger.info(f"처리 완료: {processed_files}개 파일, {total_chunks}개 청크")
        
    def search_similar_notes(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """유사한 노트를 검색합니다."""
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
            logger.error(f"검색 실패: {e}")
            return []

def main():
    """메인 함수"""
    if len(sys.argv) != 2:
        print("사용법: python collect_obsidian_to_pinecone.py <obsidian_vault_path>")
        print("예시: python collect_obsidian_to_pinecone.py '/Users/gimgijin/Documents/Obsidian Vault/Univ/Computer Architecture'")
        sys.exit(1)
    
    vault_path = sys.argv[1]
    
    try:
        embedder = ObsidianEmbedder()
        embedder.process_vault(vault_path)
        
        # 테스트 검색
        print("\n=== 테스트 검색 ===")
        query = "컴퓨터 아키텍처"
        results = embedder.search_similar_notes(query, top_k=3)
        
        print(f"검색어: {query}")
        for i, match in enumerate(results, 1):
            metadata = match.metadata
            print(f"\n{i}. {metadata.get('title', 'Unknown')} (유사도: {match.score:.4f})")
            print(f"   파일: {metadata.get('file_name', 'Unknown')}")
            print(f"   내용: {metadata.get('pageContent', '')[:100]}...")
            
    except Exception as e:
        logger.error(f"실행 실패: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 