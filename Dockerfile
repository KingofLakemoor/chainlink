FROM node:22-slim

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Vite/Express app
RUN npm run build

# Expose port 8080 (Cloud Run default) and 3000
EXPOSE 8080
EXPOSE 3000

# Start the compiled Express server
CMD ["npm", "start"]
