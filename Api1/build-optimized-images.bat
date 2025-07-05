@echo off
REM Build optimized Docker images for code execution on Windows
echo Building optimized Docker images...

REM Build Python image
echo Building Python optimized image...
docker build -t leviathan-python-optimized:latest -f docker/python/Dockerfile.optimized docker/python/

REM Build JavaScript/Node.js image  
echo Building JavaScript optimized image...
docker build -t leviathan-node-optimized:latest -f docker/javascript/Dockerfile.optimized docker/javascript/

REM Build Go image
echo Building Go optimized image...
docker build -t leviathan-go-optimized:latest -f docker/go/Dockerfile.optimized docker/go/

REM Build Java image
echo Building Java optimized image...
docker build -t leviathan-java-optimized:latest -f docker/java/Dockerfile.optimized docker/java/

REM Build C++ image (gcc already has build tools)
echo Building C++ optimized image...
docker build -t leviathan-cpp-optimized:latest -f docker/cpp/Dockerfile.optimized docker/cpp/

REM Build Shared/Multi-language image for rooms
echo Building Shared multi-language image...
docker build -t leviathan-shared:latest -f docker/shared/Dockerfile docker/shared/

echo All optimized images built successfully!
echo.
echo Available images:
docker images | findstr "leviathan-.*-optimized leviathan-shared"
