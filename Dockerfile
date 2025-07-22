ARG REPO_LOCATION=
FROM ${REPO_LOCATION}node:24-alpine AS builder

### --------------------------------- Install s5cmd
# Install curl, download and extract s5cmd binary
RUN apk add --no-cache curl && \
    curl -L https://github.com/peak/s5cmd/releases/download/v2.3.0/s5cmd_2.3.0_Linux-64bit.tar.gz -o /tmp/s5cmd.tar.gz && \
    tar -xzf /tmp/s5cmd.tar.gz -C /usr/local/bin s5cmd && \
    chmod +x /usr/local/bin/s5cmd && \
    rm /tmp/s5cmd.tar.gz

# Verify installation of s5cmd and sha256sum
RUN s5cmd version
RUN sha256sum /usr/local/bin/s5cmd

### --------------------------------- Build
# Install packages and build
WORKDIR /app
COPY . ./
RUN npm ci --no-audit && \
    npm run build && \
    npm ci --omit=dev --no-audit

# Deployment container
FROM ${REPO_LOCATION}node:24-alpine

# LABEL org.opencontainers.image.description="NR Broker handles the business logic of authenticating and validating requests for automated processes to access secrets"
# LABEL org.opencontainers.image.licenses=Apache-2.0

# Copy over app
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /usr/local/bin/s5cmd /usr/local/bin/

# Start up command
ENTRYPOINT ["node", "--expose-gc", "dist/index"]