# Multi-Language Development Container
FROM ubuntu:22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=development

# Create workspace directory
WORKDIR /workspace

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    vim \
    nano \
    sudo \
    build-essential \
    pkg-config \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    apt-transport-https \
    && rm -rf /var/lib/apt/lists/*

# Install Python
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    && ln -sf python3 /usr/bin/python \
    && ln -sf pip3 /usr/bin/pip \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Go
RUN wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz \
    && rm go1.21.0.linux-amd64.tar.gz
ENV PATH="/usr/local/go/bin:${PATH}"

# Install Java
RUN apt-get update && apt-get install -y \
    openjdk-17-jdk \
    && rm -rf /var/lib/apt/lists/*
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# Install C++ tools (already included in build-essential, but ensure latest)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    gdb \
    make \
    cmake \
    && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install common Python packages
RUN pip install --no-cache-dir \
    requests \
    numpy \
    pandas \
    matplotlib \
    flask \
    fastapi \
    jupyter

# Install common Node.js packages globally
RUN npm install -g \
    typescript \
    ts-node \
    nodemon \
    express \
    lodash \
    axios

# Create a non-root user for security
RUN useradd -m -s /bin/bash coder && \
    echo "coder ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Set up workspace permissions
RUN chown -R coder:coder /workspace

# Switch to non-root user
USER coder

# Set working directory
WORKDIR /workspace

# Default command (keeps container running)
CMD ["/bin/bash"]
