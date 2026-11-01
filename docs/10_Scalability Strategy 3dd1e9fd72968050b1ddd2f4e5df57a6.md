# 10_Scalability Strategy

## Initial Architecture

The MVP should prioritize simplicity.

```mermaid
flowchart LR
	A[User] --> B[Web Application]
	B --> C[Backend API]
	C --> D[PostgreSQL]
```

## Future Scaling

As usage increases:

```mermaid
flowchart TD
	 A[Users] --> B[Load Balancer]
	 B --> 1[API 1] --> C
	 B --> 2[API 2] --> C
	 B --> 3[API 3] --> C
	 C[PostgreSQL]
```

Additional scaling mechanisms could include:

- Horizontal scaling
- Caching
- Database optimization
- Indexing
- CDN
- Background processing

## Scaling Principle

Do not introduce infrastructure before there is a demonstrated requirement for it.