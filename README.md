# Behat in Docker Extension for VS Code

This extension was developed with the assistance of AI tools.

Run Behat tests inside Docker containers directly from VS Code's Test Explorer UI.

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/xMIkeXeeioi.vscode-behat-in-docker)](https://marketplace.visualstudio.com/items?itemName=xMIkeXeeioi.vscode-behat-in-docker)

## Features

- 🐳 Execute Behat tests in Docker containers
- 🔍 Automatic feature discovery based on glob file patterns
- ▶️ Run tests at multiple levels (feature file, scenario)
- 🐛 Debug support with Xdebug integration
- 📋 Rich error reporting with source locations
- 📂 Configurable container paths and Behat executable locations

## Installation

1. Install the extension from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=xMIkeXeeioi.vscode-behat-in-docker)
2. Ensure your Docker container is running with your PHP project mounted
3. Configure the extension settings (see below)

## Configuration

Open VS Code settings (Ctrl+,) and configure under **Behat in Docker**:

- `behatDocker.containerName`: **Required**  
  Your Docker container name (e.g. `my-php-container`)
- `behatDocker.containerPath`: Path inside the container where the project is mounted  
  (Default: `/var/www`)
- `behatDocker.behatPath`: Path to the Behat executable relative to the project root  
  (Default: `vendor/bin/behat`)
- `behatDocker.testFilePattern`: Glob pattern for feature files  
  (Default: `**/*.feature`)

## Usage

1. Open the Test Explorer (View → Testing)
2. Feature files and scenarios will automatically be discovered from your project
3. Use the run/debug icons next to:
   - Individual scenarios (within a feature file)
   - Entire feature files

## Debugging Tests

1. Ensure Xdebug is configured in your Docker container
2. Set breakpoints in your feature files or supporting code
3. Use the "Debug" profile from the Test Explorer
4. VS Code will automatically attach to the debugger
