# Saga Pattern Implementation with Node.js/Express

이 프로젝트는 마이크로서비스 환경에서 분산 트랜잭션을 관리하기 위한 Saga 패턴의 구현 예제입니다. Choreography와 Orchestration 두 가지 방식을 모두 구현했습니다.

## 프로젝트 구조

```
saga-playground/
├── services/
│   ├── order-service/         # 주문 서비스
│   ├── payment-service/       # 결제 서비스 (Toss Payments 통합)
│   ├── inventory-service/     # 재고 서비스
│   └── orchestrator-service/  # 오케스트레이터 서비스
│       └── public/           # 웹 대시보드 UI
├── payment-frontend/         # React 기반 프론트엔드 애플리케이션
│   ├── src/
│   │   ├── pages/           # 페이지 컴포넌트
│   │   ├── hooks/           # 커스텀 React 훅
│   │   ├── services/        # API 서비스
│   │   └── types/           # TypeScript 타입 정의
│   └── Dockerfile           # 프론트엔드 Docker 설정
├── kafka-broker/             # Kafka 공통 모듈
├── mongo-init/               # MongoDB Replica Set 초기화 스크립트
│   └── init-replica-sets.sh
├── docker-compose.yml        # Docker 설정
├── start-services.sh         # 서비스 시작 스크립트
├── stop-services.sh          # 서비스 중지 스크립트
├── test-scenarios.sh         # 테스트 시나리오 자동화
└── README.md
```

## 기술 스택

- **Node.js** + **Express**: 각 마이크로서비스 구현
- **React** + **TypeScript**: 프론트엔드 애플리케이션
  - Custom Hooks를 활용한 상태 관리
  - Tailwind CSS로 구현한 모던 UI
- **Kafka**: 이벤트 스트리밍 및 메시지 브로커
- **MongoDB**: 각 서비스별 독립적인 데이터베이스 (Replica Set 구성)
- **Docker**: 컨테이너화 및 환경 구성
- **Kafka UI**: Kafka 클러스터 모니터링 대시보드
- **웹 대시보드**: Saga 상태 실시간 모니터링 UI
- **Toss Payments**: 실제 결제 처리 통합
- **Nginx**: 프론트엔드 서빙을 위한 웹 서버

## Saga Pattern 구현 방식

### 1. Choreography (코레오그래피) - 현재 비활성화
- 각 서비스가 이벤트를 발행하고 구독하는 분산 방식
- 중앙 제어자 없이 서비스 간 직접 통신
- 이벤트 체인: Order Created → Payment Processed → Inventory Reserved
- **현재 Toss Payments 통합으로 인해 Orchestration 방식만 사용 가능**

### 2. Orchestration (오케스트레이션) - 현재 활성화
- 중앙 오케스트레이터가 전체 워크플로우를 관리
- 각 단계를 순차적으로 제어하고 상태를 추적
- 실패 시 보상 트랜잭션을 체계적으로 관리
- Toss Payments를 통한 실제 결제 처리

## 시작하기

### 1. 의존성 설치

```bash
# 루트 디렉토리에서
npm install

# 모든 서비스의 의존성 설치
npm run install:all
```

### 2. Docker 환경 시작

```bash
# Kafka, MongoDB, Kafka UI 컨테이너 시작 (Replica Set 자동 초기화 포함)
docker-compose up -d
```

시작되는 서비스들:
- **Kafka & Zookeeper**: 메시지 브로커
- **MongoDB 인스턴스들**: 각 서비스별 데이터베이스 (Replica Set 구성)
- **Kafka UI**: Kafka 모니터링 대시보드 (http://localhost:8080)
- **mongo-init**: MongoDB Replica Set 자동 초기화

## 포트 매핑

| 서비스 | 포트 | 설명 |
|--------|------|------|
| Order Service | 3001 | 주문 서비스 API |
| Payment Service | 3002 | 결제 서비스 API |
| Inventory Service | 3003 | 재고 서비스 API |
| Orchestrator Service | 3004 | 오케스트레이터 API |
| Saga Dashboard | 3004 | 웹 대시보드 UI |
| **Payment Frontend** | **3000** | **React 프론트엔드 애플리케이션** |
| Kafka UI | 8080 | Kafka 모니터링 대시보드 |
| Kafka Broker | 9092 | Kafka 브로커 |
| Zookeeper | 2181 | Zookeeper 서비스 |
| MongoDB (Order) | 27017 | 주문 DB |
| MongoDB (Payment) | 27018 | 결제 DB |
| MongoDB (Inventory) | 27019 | 재고 DB |
| MongoDB (Orchestrator) | 27020 | 오케스트레이터 DB |

MongoDB Replica Set은 `mongo-init` 컨테이너가 자동으로 초기화합니다.

### 3. 서비스 시작

#### 옵션 1: 자동 시작 스크립트 사용 (권장)

```bash
# 모든 서비스를 백그라운드에서 시작
./start-services.sh

# 서비스 중지
./stop-services.sh
```

#### 옵션 2: 각 서비스를 별도의 터미널에서 시작

```bash
# Order Service
cd services/order-service && npm start

# Payment Service
cd services/payment-service && npm start

# Inventory Service
cd services/inventory-service && npm start

# Orchestrator Service (Orchestration 방식 사용 시)
cd services/orchestrator-service && npm start

# Payment Frontend
cd payment-frontend && npm run dev
```

## API 엔드포인트

### Order Service (Port 3001)
- `POST /api/orders` - 새 주문 생성 (Choreography)
- `GET /api/orders` - 모든 주문 조회
- `GET /api/orders/:orderId` - 특정 주문 조회
- `POST /api/orders/:orderId/cancel` - 주문 취소

### Payment Service (Port 3002)
- `GET /api/payments` - 모든 결제 조회
- `GET /api/payments/:paymentId` - 특정 결제 조회
- `GET /api/payments/order/:orderId` - 주문별 결제 조회
- `POST /api/payments/order/:orderId/refund` - 결제 환불
- `POST /api/payments/confirm` - Toss Payments 결제 확인
- `POST /api/payments/create-from-toss` - Toss 데이터로부터 결제 문서 생성 (복구용)

### Inventory Service (Port 3003)
- `POST /api/inventory/initialize` - 샘플 재고 초기화
- `GET /api/inventory` - 모든 재고 조회
- `GET /api/inventory/:productId` - 특정 제품 재고 조회
- `GET /api/reservations/order/:orderId` - 주문별 재고 예약 조회

### Orchestrator Service (Port 3004)
- `POST /api/orchestrator/orders` - 새 주문 생성 (Orchestration)
- `GET /api/orchestrator/sagas` - 모든 Saga 조회 (페이지네이션 지원)
  - Query parameters:
    - `page`: 페이지 번호 (기본값: 1)
    - `limit`: 페이지당 항목 수 (기본값: 10)
    - `status`: 상태 필터 배열 (옵션, 빈 배열이면 모든 상태 조회)
      - 단일: `?status=FAILED`
      - 여러 개: `?status[]=FAILED&status[]=COMPENSATED`
    - `sortBy`: 정렬 기준 (기본값: createdAt)
    - `sortOrder`: 정렬 순서 asc/desc (기본값: desc)
- `GET /api/orchestrator/sagas/:sagaId` - 특정 Saga 조회
- `GET /api/orchestrator/sagas/order/:orderId` - 주문별 Saga 조회
- `POST /api/orchestrator/sagas/:sagaId/retry` - 실패한 Saga 재시도

### 웹 대시보드 (Port 3004)
- **URL**: http://localhost:3004/
- **기능**:
  - Saga 목록 조회 및 상태별 필터링
  - 실시간 자동 새로고침 (5초 간격)
  - 개별/일괄 재시도 기능
  - Saga 상세 정보 모달
  - 페이지네이션 지원

### Kafka 대시보드 (Port 8080)
- **URL**: http://localhost:8080/
- **기능**:
  - Kafka 토픽 목록 및 파티션 정보
  - 실시간 메시지 모니터링
  - Consumer Group 상태 확인
  - 메시지 내용 직접 조회
  - 토픽별 메시지 통계

## 테스트 시나리오

### 1. 프론트엔드를 통한 테스트 (권장)

1. **프론트엔드 접속**: http://localhost:3000/
2. **상품 선택**: 원하는 상품을 장바구니에 추가
3. **주문 생성**: "Orchestration 방식으로 주문" 버튼 클릭
4. **결제 진행**: Toss Payments 위젯에서 테스트 카드 정보 입력
   - 카드번호: 4242-4242-4242-4242
   - 유효기간: 미래 날짜
   - CVC: 임의의 3자리 숫자
5. **주문 확인**: Orchestration Orders 페이지에서 상태 확인

### 2. API를 통한 Choreography 방식 테스트

```bash
# 1. 재고 초기화
curl -X POST http://localhost:3003/api/inventory/initialize

# 2. 주문 생성 (성공 케이스)
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUST001",
    "items": [
      {
        "productId": "PROD001",
        "productName": "Laptop",
        "quantity": 2,
        "price": 999.99
      }
    ]
  }'

# 3. 주문 상태 확인
curl http://localhost:3001/api/orders

# 4. 결제 상태 확인
curl http://localhost:3002/api/payments

# 5. 재고 상태 확인
curl http://localhost:3003/api/inventory
```

### 3. API를 통한 Orchestration 방식 테스트

```bash
# 1. Orchestrator를 통한 주문 생성
curl -X POST http://localhost:3004/api/orchestrator/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUST002",
    "items": [
      {
        "productId": "PROD002",
        "productName": "Mouse",
        "quantity": 5,
        "price": 29.99
      }
    ]
  }'

# 2. Saga 상태 확인
curl http://localhost:3004/api/orchestrator/sagas
```

### 4. 실패 시나리오 테스트

```bash
# 대량 주문으로 재고 부족 유발
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUST003",
    "items": [
      {
        "productId": "PROD001",
        "productName": "Laptop",
        "quantity": 100,
        "price": 999.99
      }
    ]
  }'
```

### 5. 자동화된 테스트 시나리오

```bash
# 모든 테스트 시나리오 실행
./test-scenarios.sh
```

이 스크립트는 다음을 자동으로 수행합니다:
- 재고 초기화
- Choreography 방식 주문 생성 및 상태 확인
- Orchestration 방식 주문 생성 및 Saga 상태 확인
- 실패 시나리오 테스트 (재고 부족)
- 실패한 Saga 재시도

## Kafka 대시보드 사용법

### 1. 토픽 모니터링
Kafka UI에서 다음 토픽들을 확인할 수 있습니다:

**Choreography 이벤트 토픽**:
- `order.created`: 주문 생성 이벤트
- `payment.processed`: 결제 완료 이벤트
- `payment.failed`: 결제 실패 이벤트
- `inventory.reserved`: 재고 예약 이벤트
- `inventory.failed`: 재고 부족 이벤트

**Orchestration 명령 토픽**:
- `orchestrator.saga`: 오케스트레이터 명령
- `orchestrator.reply`: 서비스 응답

### 2. 실시간 메시지 확인
1. Kafka UI에서 원하는 토픽 선택
2. "Messages" 탭에서 실시간 메시지 확인
3. 메시지 내용을 JSON 형태로 확인 가능

### 3. Consumer Group 모니터링
1. "Consumer Groups" 탭에서 각 서비스의 그룹 확인:
   - `order-service-group`
   - `payment-service-group`
   - `inventory-service-group`
   - `orchestrator-service-group`
2. Lag 정보로 처리 지연 확인

### 4. 이벤트 흐름 디버깅
**Choreography 방식 디버깅**:
1. 주문 생성 후 `order.created` 토픽 확인
2. `payment.processed` 또는 `payment.failed` 이벤트 추적
3. `inventory.reserved` 또는 `inventory.failed` 이벤트 확인

**Orchestration 방식 디버깅**:
1. `orchestrator.saga` 토픽에서 명령 확인
2. `orchestrator.reply` 토픽에서 응답 추적
3. 각 단계별 성공/실패 메시지 분석

## API 응답 예시

### Saga 목록 조회 응답
```json
{
  "data": [
    {
      "sagaId": "550e8400-e29b-41d4-a716-446655440000",
      "orderId": "123e4567-e89b-12d3-a456-426614174000",
      "status": "COMPLETED",
      "currentStep": "COMPLETED",
      "orderData": {
        "customerId": "CUST001",
        "totalAmount": 1999.98,
        "items": [...]
      },
      "createdAt": "2024-01-20T10:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 48,
    "limit": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Saga 재시도 응답
```json
{
  "message": "Saga retry initiated successfully",
  "sagaId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Saga 상태 및 단계

### Saga 상태 (Status)
- **STARTED**: Saga 시작됨
- **ORDER_CREATED**: 주문 생성 완료
- **PAYMENT_PROCESSING**: 결제 처리 중
- **PAYMENT_COMPLETED**: 결제 완료
- **INVENTORY_RESERVING**: 재고 예약 중
- **INVENTORY_RESERVED**: 재고 예약 완료
- **COMPLETED**: Saga 성공적으로 완료
- **COMPENSATING**: 보상 트랜잭션 진행 중
- **COMPENSATED**: 보상 트랜잭션 완료 (롤백됨)
- **FAILED**: Saga 실패 (보상할 단계가 없는 경우)

### Payment 상태
- **PENDING**: 결제 대기
- **PROCESSING**: 결제 처리 중
- **SUCCESS**: 결제 성공
- **FAILED**: 결제 실패
- **REFUNDED**: 환불 완료
- **CANCELLED**: 결제 취소
- **TOSS_SUCCESS_DB_FAILED**: Toss 결제는 성공했으나 DB 저장 실패

### Current Step
- **CREATE_ORDER**: 주문 생성 단계
- **PROCESS_PAYMENT**: 결제 처리 단계
- **RESERVE_INVENTORY**: 재고 예약 단계
- **COMPLETE_ORDER**: 주문 완료 단계
- **COMPENSATE**: 보상 진행 단계
- **COMPLETED**: 모든 단계 완료

## 보상 트랜잭션

각 서비스는 실패 시 다음과 같은 보상 트랜잭션을 수행합니다:

1. **Payment 실패**: 주문 상태를 FAILED로 변경
2. **Inventory 실패**: 결제 환불 → 주문 취소
3. **주문 취소**: 재고 해제 → 결제 환불/취소

### Toss Payment 복구 프로세스
1. **Toss 결제 성공 후 DB 저장 실패 시**:
   - `tossPaymentData`가 이벤트에 포함됨
   - Orchestrator가 `ensurePaymentDocumentExists`를 호출
   - Payment Service의 `/api/payments/create-from-toss` 엔드포인트로 결제 문서 생성
   - 정상 플로우로 계속 진행

### Saga 재시도
- **재시도 가능 상태**: FAILED, COMPENSATED
- **재시도 동작**: 실패한 단계부터 다시 시작
- **재시도 이력**: 각 재시도 시도가 기록됨

## 이벤트 플로우

### Choreography 이벤트
- `order.created`: 주문 생성 시 발행
- `payment.processed`: 결제 성공 시 발행
- `payment.failed`: 결제 실패 시 발행 (tossPaymentData 포함 가능)
- `inventory.reserved`: 재고 예약 성공 시 발행
- `inventory.failed`: 재고 부족 시 발행
- `order.cancelled`: 주문 취소 시 발행

### Orchestration 커맨드
- `orchestrator.saga`: 오케스트레이터의 명령
  - Commands: `PROCESS_PAYMENT`, `RESERVE_INVENTORY`, `RELEASE_INVENTORY`, `REFUND_PAYMENT`, `CANCEL_ORDER`
- `orchestrator.reply`: 서비스의 응답
  - Status: `SUCCESS`, `FAILED`
  - Data: 성공/실패 정보 및 tossPaymentData (결제 복구용)

### 결제 복구 플로우
1. Toss 결제 성공 → DB 저장 실패 시
2. `ORCHESTRATOR_REPLY` 또는 `PAYMENT_FAILED` 이벤트에 `tossPaymentData` 포함
3. Orchestrator가 `ensurePaymentDocumentExists`를 통해 결제 문서 생성
4. 다음 단계로 진행 가능

## 모니터링

### 헬스체크 엔드포인트
- Order Service: http://localhost:3001/health
- Payment Service: http://localhost:3002/health
- Inventory Service: http://localhost:3003/health
- Orchestrator Service: http://localhost:3004/health

### 웹 대시보드
- **Payment Frontend**: http://localhost:3005/
  - 상품 목록 및 장바구니 기능
  - Orchestration 방식 주문 생성
  - Toss Payments 통합 결제
  - 주문 내역 및 Saga 상태 확인
  - 실패한 Saga 재시도 (환불된 결제 제외)
  - 결제 영수증 보기

- **Saga 대시보드**: http://localhost:3004/
  - 실시간 Saga 상태 모니터링
  - 상태별 필터링 (다중 선택 가능)
  - 페이지당 표시 항목 수 조정 (10/20/50/100)
  - 자동 새로고침 (5초 간격, 토글 가능)
  - Saga 상세 정보 보기 (단계별 상태, 에러 메시지, 재시도 이력)
  - 개별 Saga 재시도
  - 실패한 모든 Saga 일괄 재시도

- **Kafka 대시보드**: http://localhost:8080/
  - Kafka 클러스터 및 브로커 상태
  - 토픽별 메시지 생산/소비 통계
  - Consumer Group 모니터링
  - 메시지 내용 실시간 확인
  - 파티션별 오프셋 정보

## 프론트엔드 애플리케이션

### React 프론트엔드 (Port 3000)
- **URL**: http://localhost:3005/
- **주요 페이지**:
  - `/` - 상품 목록 및 장바구니
  - `/orchestration-orders` - Orchestration 방식 주문 내역
  - `/choreography-orders` - Choreography 방식 주문 내역 (현재 비활성화)
  - `/payment/:orderId` - 결제 페이지 (Toss Payments Widget)
  - `/payment/success` - 결제 성공 페이지
  - `/payment/fail` - 결제 실패 페이지

### 프론트엔드 시작
```bash
# 프론트엔드 디렉토리로 이동
cd payment-frontend

# 의존성 설치
npm install

# 개발 서버 시작
npm run dev

# 프로덕션 빌드
npm run build
```

### 환경 변수 설정
`payment-frontend/.env` 파일 생성:
```env
VITE_TOSS_CLIENT_KEY=your_toss_client_key_here
VITE_API_BASE_URL=http://localhost:3001
```

## 주의사항

1. **Payment Service**: Toss Payments와 실제 통합되어 있습니다. 테스트 키를 사용하세요.
2. **Inventory Service**: 시작 시 자동으로 샘플 재고가 초기화됩니다.
3. **데이터베이스**: 각 서비스는 독립적인 MongoDB 인스턴스를 사용하며, 트랜잭션 지원을 위해 Single Replica Set으로 구성됩니다.
4. **Kafka**: 모든 이벤트는 Kafka를 통해 비동기적으로 처리됩니다.
5. **Kafka 버전**: Confluent Kafka 7.4.4 버전을 사용합니다 (최신 버전은 추가 설정 필요).
6. **MongoDB Replica Set**: 각 서비스별로 독립된 replica set (rs-order, rs-payment, rs-inventory, rs-orchestrator)이 구성됩니다.
7. **자동 초기화**: `mongo-init` 컨테이너가 모든 MongoDB 인스턴스의 Replica Set을 자동으로 초기화합니다.
8. **Toss Payments**: 결제 처리는 Toss Payments의 실제 API를 사용합니다. 개발/테스트 환경에서는 테스트 키를 사용하세요.
9. **결제 복구**: Toss 결제 성공 후 DB 저장 실패 시, `tossPaymentData`를 통해 결제 정보를 복구할 수 있습니다.
10. **환불된 결제**: 환불된 결제는 재시도할 수 없도록 UI에서 제한됩니다.

## 트러블슈팅

### Kafka 연결 오류
Kafka 컨테이너가 제대로 시작되지 않는 경우:
```bash
# Docker 로그 확인
docker-compose logs kafka

# 컨테이너 재시작
docker-compose restart kafka
```

### MongoDB Replica Set 오류
MongoDB 연결 오류가 발생하는 경우:
```bash
# Replica Set 상태 확인
docker exec saga-playground-mongodb-order-1 mongosh --eval 'rs.status()'

# Replica Set 재초기화
docker-compose restart mongo-init

# 초기화 로그 확인
docker-compose logs mongo-init
```

### Kafka UI 접속 오류
Kafka UI에 접속할 수 없는 경우:
```bash
# Kafka UI 컨테이너 상태 확인
docker-compose ps kafka-ui

# Kafka UI 로그 확인
docker-compose logs kafka-ui

# Kafka 브로커 연결 상태 확인
docker-compose logs kafka
```

### 포트 충돌 해결
다른 애플리케이션과 포트가 충돌하는 경우:
```bash
# 포트 사용 확인
lsof -i :8080  # Kafka UI
lsof -i :3004  # Orchestrator/Saga Dashboard
lsof -i :9092  # Kafka

# 사용 중인 프로세스 종료 후 재시작
docker-compose down && docker-compose up -d
```

## 종료

```bash
# 모든 서비스 종료 (Ctrl+C)

# Docker 컨테이너 종료
docker-compose down

# 볼륨까지 삭제하려면
docker-compose down -v
```