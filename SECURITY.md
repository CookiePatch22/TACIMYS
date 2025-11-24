## Simple TLS & mTLS Certificate Generation

This guide explains a **very simplified** method to generate certificates for:

* **Server TLS** (with SAN provided directly as command arguments)
* **Client certificate for mTLS**
* **No extra config files**
* **No unnecessary OpenSSL files**

Everything is done using **inline arguments only**.

---

# 1. Requirements

You only need **OpenSSL**:

```bash
openssl version
```

---

# 2. Create a Root CA

This CA will sign both the server and client certificates.

### Generate the CA private key

```bash
openssl genrsa -out ca.key 4096
```

### Create a self‑signed CA certificate

```bash
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.crt -subj "/CN=MyRootCA"
```

Files created:

```
ca.key  # Root CA private key
ca.crt  # Root CA certificate
```

---

# 3. Create the Server Certificate

### 3.1 Generate private key

```bash
openssl genrsa -out server.key 2048
```

### 3.2 Create CSR
```bash
openssl req -new -key server.key -out server.csr -subj "/CN=tacimys.local"
```

### 3.3 Sign server certificate with CA

```bash
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 825 -sha256
```

Files:

```
server.key
server.csr
server.crt
```

---

# 4. Create a Client Certificate

### 4.1 Generate client key

```bash
openssl genrsa -out client.key 2048
```

### 4.2 Create CSR

```bash
openssl req -new -key client.key -out client.csr -subj "/CN=client"
```

### 4.3 Sign client certificate with CA

```bash
openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out client.crt -days 825 -sha256
```

Files:

```
client.key
client.csr
client.crt
```

---

# 5. Summary of All Files

```
ca.key
ca.crt
server.key
server.csr
server.crt
client.key
client.csr
client.crt
```

No configs.
No SAN files.
No extra directories.
Everything minimal.

---

# 6. Environment Variables (for your Node.js server)

| Variable                  | Description                         |
| ------------------------- | ----------------------------------- |
| `TLS_KEY`                 | Path to server.key                  |
| `TLS_CERT`                | Path to server.crt                  |
| `TLS_CA`                  | Path to ca.crt (enable mTLS)        |
| `TLS_REJECT_UNAUTHORIZED` | `true` = require client certificate |

### TLS only

```bash
export TLS_KEY="./server.key"
export TLS_CERT="./server.crt"
node server.js
```

### Full mTLS

```bash
export TLS_KEY="./server.key"
export TLS_CERT="./server.crt"
export TLS_CA="./ca.crt"
export TLS_REJECT_UNAUTHORIZED=true
node server.js
```

---

# 7. Test mTLS

### With client certificate (will succeed)

```bash
curl --cert client.crt --key client.key https://tacimys.local:3000 -k
```

### Without client certificate (will fail if mTLS is required)

```bash
curl https://tacimys.local:3000 -k
```
