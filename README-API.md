# Sandbox Master API
API para gerenciamento de sandboxes Docker

## Version: 1.0.0

---

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

### [POST] /sandbox/cmd
**Executa um comando no diretório sandbox**

#### Request Body

| Required | Schema |
| -------- | ------ |
|  Yes | **application/json**: { **"command"**: string }<br> |

#### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Saída do comando | **application/json**: { **"output"**: string }<br> |
| 400 | Comando inválido | **application/json**: [Error](#error)<br> |
| 500 | Erro interno | **application/json**: [Error](#error)<br> |

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

### [POST] /sandbox/restart
**Reinicia o servidor master (sai do processo)**

#### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Reiniciando... | **application/json**: { **"message"**: string }<br> |

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
