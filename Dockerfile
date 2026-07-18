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

# Expose port 3000 (Cloud Run will route traffic here)
EXPOSE 3000

# Start the compiled Express server
CMD ["npm", "start"]
