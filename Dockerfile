ARG REPO_LOCATION=
FROM ${REPO_LOCATION}node:20 as builder

### --------------------------------- Build
# Install packages and build
WORKDIR /app
COPY . ./
RUN npm ci --no-audit && \
    npm run build && \
    npm ci --omit=dev --no-audit

# Deployment container
FROM ${REPO_LOCATION}node:20

# LABEL org.opencontainers.image.description="NR Broker handles the business logic of authenticating and validating requests for automated processes to access secrets"
# LABEL org.opencontainers.image.licenses=Apache-2.0

# Copy over app
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Start up command
ENTRYPOINT ["node", "dist/index"]