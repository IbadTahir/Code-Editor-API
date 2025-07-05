#!/bin/bash

# Build optimized Docker images for code execution
echo "Building optimized Docker images..."

# Build Python image
echo "Building Python optimized image..."
docker build -t leviathan-python-optimized:latest -f docker/python/Dockerfile.optimized docker/python/

# Build JavaScript/Node.js image  
echo "Building JavaScript optimized image..."
docker build -t leviathan-node-optimized:latest -f docker/javascript/Dockerfile.optimized docker/javascript/

# Build Go image
echo "Building Go optimized image..."
docker build -t leviathan-go-optimized:latest -f docker/go/Dockerfile.optimized docker/go/

# Build Java image
echo "Building Java optimized image..."
docker build -t leviathan-java-optimized:latest -f docker/java/Dockerfile.optimized docker/java/

# Build C++ image (gcc already has build tools)
echo "Building C++ optimized image..."
docker build -t leviathan-cpp-optimized:latest -f docker/cpp/Dockerfile.optimized docker/cpp/

# Build Shared/Multi-language image for rooms
echo "Building Shared multi-language image..."
docker build -t leviathan-shared:latest -f docker/shared/Dockerfile docker/shared/

echo "All optimized images built successfully!"
echo ""
echo "Available images:"
docker images | grep "leviathan-.*-optimized\|leviathan-shared"
