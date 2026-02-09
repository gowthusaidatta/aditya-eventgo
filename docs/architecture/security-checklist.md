# EventGo Security Checklist

- Backend RBAC enforcement for all endpoints
- Tenant isolation by PK/SCOPED queries
- Rate limiting via API Gateway/WAF
- Input validation and schema validation
- File upload validation (type/size)
- Strict CORS and CSP
- Audit logs for privileged actions
- Environment separation (dev/stage/prod)
- Secrets in AWS Secrets Manager
- Log redaction for PII
