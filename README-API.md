# Sandbox Master API
API para gerenciamento de sandboxes Docker com suporte a WebSockets (Socket.IO) para atualizações em tempo real.

## Version: 1.0.0

---
## Assets

### [GET] /projects/{projectUid}/assets
**Lista todos os assets de um projeto**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Lista de assets |

### [POST] /projects/{projectUid}/assets
**Cria um novo asset (metadados) no projeto**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |

#### Request Body

| Required | Schema |
| -------- | ------ |
|  Yes | **application/json**: { **"type"**: string, **"name"**: string, **"path"**: string, **"configs"**: object, **"binary"**: binary, **"text"**: string }<br> |

#### Responses

| Code | Description |
| ---- | ----------- |
| 201 | Asset criado |
| 403 | Permissão insuficiente (requer editor) |

### [GET] /projects/{projectUid}/assets/{assetUid}
**Retorna um asset específico**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |
| assetUid | path |  | Yes | string |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Asset |
| 404 | Não encontrado |

### [PUT] /projects/{projectUid}/assets/{assetUid}
**Atualiza um asset (requer editor)**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |
| assetUid | path |  | Yes | string |

#### Request Body

| Required | Schema |
| -------- | ------ |
|  Yes | **application/json**: { **"name"**: string, **"configs"**: object, **"binary"**: binary, **"text"**: string }<br> |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Asset atualizado |
| 403 | Permissão insuficiente |
| 404 | Não encontrado |

### [DELETE] /projects/{projectUid}/assets/{assetUid}
**Remove um asset (requer editor)**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |
| assetUid | path |  | Yes | string |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Asset removido |
| 403 | Permissão insuficiente |

---
## Auth

### [POST] /auth/register
**Registra um novo usuário**

#### Request Body

| Required | Schema |
| -------- | ------ |
|  Yes | **application/json**: { **"name"**: string, **"email"**: string (email), **"password"**: string }<br> |

#### Responses

| Code | Description |
| ---- | ----------- |
| 201 | Usuário criado |
| 400 | Dados inválidos |
| 409 | Email já cadastrado |

### [POST] /auth/login
**Faz login e retorna token JWT**

#### Request Body

| Required | Schema |
| -------- | ------ |
|  Yes | **application/json**: { **"email"**: string (email), **"password"**: string }<br> |

#### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Token JWT | **application/json**: { **"token"**: string }<br> |
| 401 | Credenciais inválidas |  |

### [POST] /auth/logout
**Logout (apenas no cliente, invalida token localmente)**

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Logout efetuado |

---
## Builds

### [POST] /sandbox/build
**Faz upload de um arquivo (tar/zip) com Dockerfile, constrói e executa**

#### Request Body

| Required | Schema |
| -------- | ------ |
|  Yes | **multipart/form-data**: { **"file"**: binary, **"name"**: string, **"internalPorts"**: string, **"env"**: string }<br> |

#### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Build concluído e container em execução | **application/json**: { **"message"**: string } & [BuildInfo](#buildinfo)<br> |
| 400 | Parâmetros inválidos | **application/json**: [Error](#error)<br> |
| 500 | Erro interno | **application/json**: [Error](#error)<br> |

### [GET] /sandbox/builds
**Lista todos os builds ativos**

#### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Lista de builds | **application/json**: { **"builds"**: [ [BuildInfo](#buildinfo) ] }<br> |

### [POST] /sandbox/builds/{name}/stop
**Para um container de build**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| name | path | Nome base do build (sem prefixo) | Yes | string |

#### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Build parado | **application/json**: { **"message"**: string }<br> |
| 500 | Erro interno | **application/json**: [Error](#error)<br> |

### [DELETE] /sandbox/builds/{name}
**Remove um container de build**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| name | path |  | Yes | string |

#### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Build removido | **application/json**: { **"message"**: string }<br> |
| 500 | Erro interno | **application/json**: [Error](#error)<br> |

---
## Collaborators

### [GET] /projects/{projectUid}/collaborators
**Lista colaboradores de um projeto**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Lista de colaboradores |

### [POST] /projects/{projectUid}/collaborators
**Adiciona um colaborador ao projeto**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |

#### Request Body

| Required | Schema |
| -------- | ------ |
|  Yes | **application/json**: { **"email"**: string (email), **"role"**: string, <br>**Available values:** "editor", "viewer", **"startAt"**: dateTime, **"endAt"**: dateTime }<br> |

#### Responses

| Code | Description |
| ---- | ----------- |
| 201 | Colaborador adicionado |
| 400 | Dados inválidos |
| 404 | Usuário não encontrado |
| 409 | Já é colaborador |

### [PATCH] /projects/{projectUid}/collaborators/{userUid}
**Atualiza papel ou período de um colaborador**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |
| userUid | path |  | Yes | string |

#### Request Body

| Required | Schema |
| -------- | ------ |
|  No | **application/json**: { **"role"**: string, <br>**Available values:** "editor", "viewer", **"startAt"**: dateTime, **"endAt"**: dateTime }<br> |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Colaborador atualizado |
| 404 | Não encontrado |

### [DELETE] /projects/{projectUid}/collaborators/{userUid}
**Remove um colaborador do projeto**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |
| userUid | path |  | Yes | string |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Colaborador removido |
| 404 | Não encontrado |

---
## Contributions

### [GET] /contributions/me
**Lista as contribuições do próprio usuário**

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Lista de contribuições |

### [GET] /contributions/projects/{projectUid}
**Lista as contribuições de um projeto (requer acesso)**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Lista de contribuições |
| 403 | Acesso negado |

---
## Arquivos

### [POST] /sandbox/file
**Cria um arquivo no diretório sandbox**

#### Request Body

| Required | Schema |
| -------- | ------ |
|  Yes | **application/json**: { **"filename"**: string, **"content"**: string }<br> |

#### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Arquivo criado | **application/json**: { **"message"**: string, **"path"**: string }<br> |
| 400 | Nome do arquivo inválido | **application/json**: [Error](#error)<br> |
| 500 | Erro interno | **application/json**: [Error](#error)<br> |

### [DELETE] /sandbox/file/{filename}
**Remove um arquivo do diretório sandbox**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| filename | path | Nome do arquivo | Yes | string |

#### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Arquivo removido | **application/json**: { **"message"**: string }<br> |
| 500 | Erro interno | **application/json**: [Error](#error)<br> |

---
## Comandos

### [POST] /sandbox/install
**Instala um pacote npm no diretório sandbox**

#### Request Body

| Required | Schema |
| -------- | ------ |
|  Yes | **application/json**: { **"pkg"**: string }<br> |

#### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Saída da instalação | **application/json**: { **"output"**: string }<br> |
| 400 | Nome do pacote inválido | **application/json**: [Error](#error)<br> |
| 500 | Erro interno | **application/json**: [Error](#error)<br> |

---
## Invites

### [POST] /projects/{projectUid}/invites
**Cria um link de convite para o projeto**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |

#### Request Body

| Required | Schema |
| -------- | ------ |
|  No | **application/json**: { **"role"**: string, <br>**Available values:** "viewer", "editor", <br>**Default:** viewer, **"expiresIn"**: integer }<br> |

#### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 201 | Convite criado | **application/json**: { **"inviteUid"**: string, **"inviteUrl"**: string, **"token"**: string, **"expiresAt"**: dateTime }<br> |
| 403 | Permissão insuficiente |  |

### [GET] /projects/{projectUid}/invites
**Lista os convites ativos de um projeto**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Lista de convites |

### [DELETE] /projects/{projectUid}/invites/{inviteUid}
**Cancela um convite (apaga)**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |
| inviteUid | path |  | Yes | string |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Convite cancelado |

### [POST] /invites/join
**Aceita um convite e adiciona o usuário como colaborador**

#### Request Body

| Required | Schema |
| -------- | ------ |
|  Yes | **application/json**: { **"token"**: string }<br> |

#### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Usuário adicionado ao projeto | **application/json**: { **"message"**: string, **"projectUid"**: string, **"role"**: string }<br> |
| 400 | Token inválido ou expirado |  |
| 401 | Usuário não autenticado |  |
| 409 | Já é colaborador |  |

---
## Project Commands

### [POST] /projects/{projectUid}/command
**Executa um comando no diretório do projeto**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |

#### Request Body

| Required | Schema |
| -------- | ------ |
|  Yes | **application/json**: { **"command"**: string }<br> |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Saída do comando |

### [POST] /projects/{projectUid}/install
**Instala um pacote npm no diretório do projeto**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |

#### Request Body

| Required | Schema |
| -------- | ------ |
|  Yes | **application/json**: { **"pkg"**: string }<br> |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Saída da instalação |

---
## Project Files

### [POST] /projects/{projectUid}/files
**Cria um arquivo no projeto (upload ou conteúdo texto)**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |

#### Request Body

| Required | Schema |
| -------- | ------ |
|  No | **multipart/form-data**: { **"file"**: binary, **"filename"**: string, **"content"**: string }<br>**application/json**: { **"filename"**: string, **"content"**: string }<br> | **multipart/form-data**: { **"file"**: binary, **"filename"**: string, **"content"**: string }<br>**application/json**: { **"filename"**: string, **"content"**: string }<br> |

#### Responses

| Code | Description |
| ---- | ----------- |
| 201 | Arquivo criado (retorna uid do asset) |

### [GET] /projects/{projectUid}/files
**Lista arquivos e pastas do projeto**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Lista de arquivos com metadados do asset (se houver) |

### [GET] /projects/{projectUid}/files/*
**Download de um arquivo (caminho relativo)**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |
|  | path | Caminho relativo do arquivo | Yes | string |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Arquivo |

### [DELETE] /projects/{projectUid}/files/*
**Remove um arquivo**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |
|  | path |  | Yes | string |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Arquivo removido |

---
## Projects

### [GET] /projects
**Lista projetos do usuário (owner ou colaborador) - apenas ativos**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| includeDeleted | query | Se true, inclui projetos excluídos (status = -1) | No | boolean |

#### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Lista de projetos | **application/json**: { **"projects"**: [ [Project](#project) ] }<br> |

### [POST] /projects
**Cria um novo projeto e sua pasta no sandbox**

#### Request Body

| Required | Schema |
| -------- | ------ |
|  Yes | **application/json**: { **"name"**: string }<br> |

#### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 201 | Projeto criado | **application/json**: [Project](#project)<br> |
| 400 | Nome inválido |  |
| 409 | Nome já existe |  |

### [GET] /projects/{projectUid}
**Detalhes de um projeto (requer acesso) - apenas ativo, a menos que includeDeleted=true**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |
| includeDeleted | query | Se true, permite ver projeto excluído (status = -1) | No | boolean |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Projeto |
| 403 | Acesso negado |
| 404 | Não encontrado |

### [PUT] /projects/{projectUid}
**Atualiza um projeto (requer role editor ou owner)**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |

#### Request Body

| Required | Schema |
| -------- | ------ |
|  Yes | **application/json**: { **"name"**: string }<br> |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Projeto atualizado |
| 403 | Permissão insuficiente |

### [DELETE] /projects/{projectUid}
**Remove um projeto (requer owner) - marca como excluído (status = -1) e remove a pasta do disco**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Projeto marcado como excluído |
| 403 | Apenas o owner pode deletar |

### [POST] /projects/{projectUid}/restore
**Restaura um projeto excluído (requer owner) - muda status de -1 para 1 e recria a pasta**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| projectUid | path |  | Yes | string |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Projeto restaurado |
| 403 | Permissão negada |
| 404 | Projeto não encontrado |

---
## Sistema

### [POST] /sandbox/restart
**Reinicia o servidor master (sai do processo)**

#### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Reiniciando... | **application/json**: { **"message"**: string }<br> |

---
## Users

### [GET] /users
**Lista todos os usuários (apenas admin)**

#### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Lista de usuários | **application/json**: { **"users"**: [ [User](#user) ] }<br> |
| 403 | Acesso negado (não é admin) |  |

##### Security

| Security Schema | Scopes |
| --------------- | ------ |
| bearerAuth |  |

### [GET] /users/me
**Retorna os dados do usuário logado**

#### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Dados do usuário | **application/json**: [User](#user)<br> |

##### Security

| Security Schema | Scopes |
| --------------- | ------ |
| bearerAuth |  |

### [PUT] /users/me
**Atualiza o nome do usuário logado**

#### Request Body

| Required | Schema |
| -------- | ------ |
|  Yes | **application/json**: { **"name"**: string }<br> |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Usuário atualizado |

##### Security

| Security Schema | Scopes |
| --------------- | ------ |
| bearerAuth |  |

### [POST] /users/me/change-password
**Altera a senha do usuário logado**

#### Request Body

| Required | Schema |
| -------- | ------ |
|  Yes | **application/json**: { **"currentPassword"**: string, **"newPassword"**: string }<br> |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Senha alterada com sucesso |
| 400 | Dados inválidos |
| 401 | Senha atual incorreta |

##### Security

| Security Schema | Scopes |
| --------------- | ------ |
| bearerAuth |  |

### [POST] /users/me/avatar
**Faz upload da foto de perfil do usuário**

#### Request Body

| Required | Schema |
| -------- | ------ |
|  Yes | **multipart/form-data**: { **"avatar"**: binary }<br> |

#### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Avatar atualizado | **application/json**: { **"avatarUrl"**: string }<br> |
| 400 | Erro no upload |  |

##### Security

| Security Schema | Scopes |
| --------------- | ------ |
| bearerAuth |  |

### [GET] /users/{uid}
**Retorna um usuário específico (apenas admin)**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| uid | path |  | Yes | string |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Dados do usuário |
| 403 | Acesso negado |
| 404 | Usuário não encontrado |

##### Security

| Security Schema | Scopes |
| --------------- | ------ |
| bearerAuth |  |

### [DELETE] /users/{uid}
**Remove um usuário (apenas admin)**

#### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| uid | path |  | Yes | string |

#### Responses

| Code | Description |
| ---- | ----------- |
| 200 | Usuário removido |
| 403 | Acesso negado |
| 404 | Usuário não encontrado |

##### Security

| Security Schema | Scopes |
| --------------- | ------ |
| bearerAuth |  |

---
### Schemas

#### PortMapping

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| hostPort | number | *Example:* `16100` | No |
| internalPort | number | *Example:* `3000` | No |

#### BuildInfo

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| id | string (uuid) |  | No |
| name | string |  | No |
| containerName | string |  | No |
| imageName | string |  | No |
| status | string, <br>**Available values:** "building", "running", "stopped", "error" | *Enum:* `"building"`, `"running"`, `"stopped"`, `"error"` | No |
| portMappings | [ [PortMapping](#portmapping) ] |  | No |
| createdAt | dateTime |  | No |

#### ContainerInfo

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| name | string |  | No |
| status | string |  | No |
| image | string |  | No |
| id | string |  | No |
| portMappings | [ [PortMapping](#portmapping) ] |  | No |
| type | string, <br>**Available values:** "sub", "build" | *Enum:* `"sub"`, `"build"` | No |

#### Error

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| error | string |  | No |
| logs | string |  | No |

#### Project

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| id | string (uuid) | *Example:* `"123e4567-e89b-12d3-a456-426614174000"` | No |
| name | string | *Example:* `"meu-projeto"` | No |
| ownerId | string (uuid) | *Example:* `"123e4567-e89b-12d3-a456-426614174001"` | No |
| createdAt | dateTime |  | No |
| updatedAt | dateTime |  | No |

#### User

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| id | string (uuid) |  | No |
| name | string |  | No |
| email | string (email) |  | No |
| avatar | string | URL da foto de perfil | No |
| createdAt | dateTime |  | No |
| updatedAt | dateTime |  | No |

#### Collaborator

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| id | string (uuid) |  | No |
| userId | string (uuid) |  | No |
| projectId | string (uuid) |  | No |
| role | string, <br>**Available values:** "owner", "editor", "viewer" | *Enum:* `"owner"`, `"editor"`, `"viewer"` | No |
| startAt | dateTime |  | No |
| endAt | dateTime |  | No |
| createdAt | dateTime |  | No |
| updatedAt | dateTime |  | No |
| user | [User](#user) |  | No |

#### Asset

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| id | string (uuid) |  | No |
| type | string |  | No |
| name | string |  | No |
| ownerId | string (uuid) |  | No |
| projectId | string (uuid) |  | No |
| userOwnerId | string (uuid) |  | No |
| path | string |  | No |
| configs | object |  | No |
| createdAt | dateTime |  | No |
| updatedAt | dateTime |  | No |

#### Invite

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| uid | string (uuid) |  | No |
| token | string |  | No |
| role | string, <br>**Available values:** "viewer", "editor" | *Enum:* `"viewer"`, `"editor"` | No |
| expiresAt | dateTime |  | No |
| createdAt | dateTime |  | No |
| creator | [User](#user) |  | No |

#### Contribution

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| uid | string (uuid) |  | No |
| user | [User](#user) |  | No |
| project | [Project](#project) |  | No |
| action | string |  | No |
| details | object |  | No |
| score | integer |  | No |
| createdAt | dateTime |  | No |
