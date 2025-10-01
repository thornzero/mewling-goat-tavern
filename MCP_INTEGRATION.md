# MCP Server Integration

This project uses the [mcp-server-go](https://github.com/thornzero/mcp-server-go) for enhanced project management and documentation tools.

## Installation

1. Clone the MCP server:
```bash
git clone https://github.com/thornzero/mcp-server-go.git
cd mcp-server-go
go build -o mcp-server main.go
```

2. Add to your `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "mcp-server-go": {
      "command": "/path/to/mcp-server-go/mcp-server",
      "transport": "stdio"
    }
  }
}
```

## Available Tools

The MCP server provides 15 tools for project management:

### Project Management
- Goals management (list, add, update)
- Architecture Decision Records (ADRs)
- Change logging

### Development Tools  
- Repository search
- CI integration
- Markdown linting

### Template System
- Template registration and management
- Variable support
- Content generation

See the [full documentation](https://github.com/thornzero/mcp-server-go) for complete usage instructions.
