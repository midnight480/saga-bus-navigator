# Requirements Document

## Introduction

佐賀バスナビゲーターのMCPサーバは、既存のREST API（https://saga-bus.midnight480.com/api）をMCP（Model Context Protocol）経由で利用可能にするサーバです。AI assistantが佐賀市のバス情報にアクセスし、バス停検索、経路検索、始発・終電情報の取得を行えるようにします。

## Glossary

- **MCP_Server**: Model Context Protocolに準拠したサーバ実装
- **API_Client**: 既存REST APIへのHTTPリクエストを行うクライアント
- **Tool**: MCPプロトコルで定義される、AI assistantが呼び出し可能な機能
- **Bus_Stop**: バス停の情報（名称、位置、路線情報など）
- **Route**: バスの経路情報（始点、終点、時刻表など）
- **Weekday_Type**: 曜日区分（平日、土曜、日曜祝日）

## Requirements

### Requirement 1: バス停検索機能

**User Story:** As an AI assistant, I want to search for bus stops by name, so that I can provide users with bus stop information and next departure times.

#### Acceptance Criteria

1. WHEN a bus stop name is provided, THE MCP_Server SHALL query the REST API endpoint GET /api/stops/search
2. WHEN the API returns results, THE MCP_Server SHALL return bus stop information including name, location, next departure time, and route information
3. WHEN a limit parameter is provided, THE MCP_Server SHALL pass it to the API to control the number of results
4. IF the API returns an error, THEN THE MCP_Server SHALL return a descriptive error message to the AI assistant
5. WHEN no bus stops match the search query, THE MCP_Server SHALL return an empty result set with appropriate messaging

### Requirement 2: 経路検索機能

**User Story:** As an AI assistant, I want to search for direct bus routes between two stops, so that I can help users plan their bus journeys.

#### Acceptance Criteria

1. WHEN a starting point and destination are provided, THE MCP_Server SHALL query the REST API endpoint GET /api/routes/search
2. WHEN a time parameter is provided, THE MCP_Server SHALL pass it to the API to find routes departing after that time
3. WHEN a search type parameter is provided, THE MCP_Server SHALL pass it to the API (departure or arrival time search)
4. WHEN a weekday type parameter is provided, THE MCP_Server SHALL pass it to the API to filter by weekday category
5. WHEN the API returns route results, THE MCP_Server SHALL return complete route information including departure time, arrival time, route name, and fare
6. IF the API returns an error, THEN THE MCP_Server SHALL return a descriptive error message to the AI assistant

### Requirement 3: 始発・終電検索機能

**User Story:** As an AI assistant, I want to retrieve first and last bus information for a specific stop, so that I can inform users about service hours.

#### Acceptance Criteria

1. WHEN a bus stop name is provided, THE MCP_Server SHALL query the REST API endpoint GET /api/stops/first-last
2. WHEN a destination parameter is provided, THE MCP_Server SHALL pass it to the API to filter by destination
3. WHEN a weekday type parameter is provided, THE MCP_Server SHALL pass it to the API to get weekday-specific information
4. WHEN the API returns results, THE MCP_Server SHALL return first bus time, last bus time, and route information
5. IF the API returns an error, THEN THE MCP_Server SHALL return a descriptive error message to the AI assistant

### Requirement 4: API通信とエラーハンドリング

**User Story:** As a system administrator, I want the MCP server to handle API communication reliably, so that the service remains stable and provides clear error messages.

#### Acceptance Criteria

1. WHEN making API requests, THE API_Client SHALL use the configured API base URL from environment variables
2. WHEN an API request times out, THE API_Client SHALL return a timeout error with appropriate messaging
3. WHEN the API returns a non-200 status code, THE API_Client SHALL parse the error response and return a descriptive error message
4. WHEN network errors occur, THE API_Client SHALL catch the errors and return user-friendly error messages
5. WHEN API responses are received, THE API_Client SHALL validate the response structure before returning data

### Requirement 5: MCPプロトコル準拠

**User Story:** As an MCP client, I want the server to implement the MCP protocol correctly, so that I can communicate with it using standard MCP tools.

#### Acceptance Criteria

1. THE MCP_Server SHALL implement the stdio transport for MCP communication
2. THE MCP_Server SHALL register all tools with proper schemas defining input parameters and return types
3. WHEN a tool is called, THE MCP_Server SHALL validate input parameters against the schema
4. WHEN a tool execution completes, THE MCP_Server SHALL return results in MCP-compliant format
5. WHEN a tool execution fails, THE MCP_Server SHALL return errors in MCP-compliant error format

### Requirement 6: Docker環境での実行

**User Story:** As a system administrator, I want to deploy the MCP server as a Docker container, so that it can be easily deployed and managed.

#### Acceptance Criteria

1. THE MCP_Server SHALL be packaged as a Docker container with all dependencies included
2. WHEN the container starts, THE MCP_Server SHALL read the API base URL from the API_BASE_URL environment variable
3. WHEN the API_BASE_URL is not provided, THE MCP_Server SHALL use https://saga-bus.midnight480.com/api as the default
4. THE Docker container SHALL expose the MCP server via stdio for communication
5. THE Docker container SHALL include health check mechanisms to verify the server is running correctly

### Requirement 7: TypeScript実装とビルド

**User Story:** As a developer, I want the MCP server to be implemented in TypeScript, so that it benefits from type safety and maintainability.

#### Acceptance Criteria

1. THE MCP_Server SHALL be implemented in TypeScript using the @modelcontextprotocol/sdk package
2. WHEN the project is built, THE TypeScript compiler SHALL compile all source files to JavaScript
3. THE build output SHALL include all necessary type definitions for API responses
4. THE project SHALL include a package.json with all required dependencies and build scripts
5. THE TypeScript configuration SHALL enforce strict type checking for code quality
