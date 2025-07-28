# Saga Pattern Implementation with Node.js/Express

이 프로젝트는 마이크로서비스 환경에서 분산 트랜잭션을 관리하기 위한 Saga 패턴의 구현 예제입니다. Choreography와 Orchestration 두 가지 방식을 모두 구현했습니다.

## 프로젝트 구조

```
saga-playground/
├── services/
│   ├── order-service/         # 주문 서비스
│   ├── payment-service/       # 결제 서비스
│   ├── inventory-service/     # 재고 서비스
│   └── orchestrator-service/  # 오케스트레이터 서비스
│       └── public/           # 웹 대시보드 UI
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
- **Kafka**: 이벤트 스트리밍 및 메시지 브로커
- **MongoDB**: 각 서비스별 독립적인 데이터베이스
- **Docker**: 컨테이너화 및 환경 구성

## Saga Pattern 구현 방식

### 1. Choreography (코레오그래피)
- 각 서비스가 이벤트를 발행하고 구독하는 분산 방식
- 중앙 제어자 없이 서비스 간 직접 통신
- 이벤트 체인: Order Created → Payment Processed → Inventory Reserved

### 2. Orchestration (오케스트레이션)
- 중앙 오케스트레이터가 전체 워크플로우를 관리
- 각 단계를 순차적으로 제어하고 상태를 추적
- 실패 시 보상 트랜잭션을 체계적으로 관리

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
# Kafka와 MongoDB 컨테이너 시작 (Replica Set 자동 초기화 포함)
docker-compose up -d
```

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

## 테스트 시나리오

### 1. Choreography 방식 테스트

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

### 2. Orchestration 방식 테스트

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

### 3. 실패 시나리오 테스트

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

### 4. 자동화된 테스트 시나리오

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

### Saga 재시도
- **재시도 가능 상태**: FAILED, COMPENSATED
- **재시도 동작**: 실패한 단계부터 다시 시작
- **재시도 이력**: 각 재시도 시도가 기록됨

## 이벤트 플로우

### Choreography 이벤트
- `order.created`: 주문 생성 시 발행
- `payment.processed`: 결제 성공 시 발행
- `payment.failed`: 결제 실패 시 발행
- `inventory.reserved`: 재고 예약 성공 시 발행
- `inventory.failed`: 재고 부족 시 발행
- `order.cancelled`: 주문 취소 시 발행

### Orchestration 커맨드
- `orchestrator.saga`: 오케스트레이터의 명령
- `orchestrator.reply`: 서비스의 응답

## 모니터링

### 헬스체크 엔드포인트
- Order Service: http://localhost:3001/health
- Payment Service: http://localhost:3002/health
- Inventory Service: http://localhost:3003/health
- Orchestrator Service: http://localhost:3004/health

### 웹 대시보드
- **접속**: http://localhost:3004/
- **주요 기능**:
  - 실시간 Saga 상태 모니터링
  - 상태별 필터링 (다중 선택 가능)
  - 페이지당 표시 항목 수 조정 (10/20/50/100)
  - 자동 새로고침 (5초 간격, 토글 가능)
  - Saga 상세 정보 보기 (단계별 상태, 에러 메시지, 재시도 이력)
  - 개별 Saga 재시도
  - 실패한 모든 Saga 일괄 재시도

## 주의사항

1. **Payment Service**: 데모를 위해 80% 성공률로 설정되어 있습니다.
2. **Inventory Service**: 시작 시 자동으로 샘플 재고가 초기화됩니다.
3. **데이터베이스**: 각 서비스는 독립적인 MongoDB 인스턴스를 사용하며, 트랜잭션 지원을 위해 Single Replica Set으로 구성됩니다.
4. **Kafka**: 모든 이벤트는 Kafka를 통해 비동기적으로 처리됩니다.
5. **Kafka 버전**: Confluent Kafka 7.4.4 버전을 사용합니다 (최신 버전은 추가 설정 필요).
6. **MongoDB Replica Set**: 각 서비스별로 독립된 replica set (rs-order, rs-payment, rs-inventory, rs-orchestrator)이 구성됩니다.
7. **자동 초기화**: `mongo-init` 컨테이너가 모든 MongoDB 인스턴스의 Replica Set을 자동으로 초기화합니다.

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

## 종료

```bash
# 모든 서비스 종료 (Ctrl+C)

# Docker 컨테이너 종료
docker-compose down

# 볼륨까지 삭제하려면
docker-compose down -v
```