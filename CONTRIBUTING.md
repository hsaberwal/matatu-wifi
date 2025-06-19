# Contributing to Matatu WiFi

First off, thank you for considering contributing to Matatu WiFi! It's people like you that make this project better for everyone.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:
- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Your environment details (OS, Docker version, etc.)

### Suggesting Enhancements

Enhancement suggestions are welcome! Please include:

- A clear and descriptive title
- A detailed description of the proposed feature
- Why this enhancement would be useful
- Possible implementation approach

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure the test suite passes
4. Make sure your code follows the existing style
5. Issue that pull request!

## Development Process

### Setting Up Your Development Environment

```bash
# Clone your fork
git clone https://github.com/your-username/matatu-wifi.git
cd matatu-wifi

# Add upstream remote
git remote add upstream https://github.com/original/matatu-wifi.git

# Install dependencies
docker-compose build
```

### Code Style

- **JavaScript**: We use ESLint with standard configuration
- **Python**: Follow PEP 8
- **SQL**: Use uppercase for keywords
- **Docker**: Follow official best practices

### Testing

```bash
# Run all tests
docker-compose run --rm portal npm test
docker-compose run --rm ad-service pytest

# Run specific service tests
docker-compose run --rm portal npm test -- --grep "auth"
```

### Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

Example:
```
Add Redis session management

- Implement Redis connection module
- Update auth controller to use Redis
- Add session expiration logic

Fixes #123
```

## Project Structure

When adding new features, follow the existing structure:

```
services/
├── portal/           # Node.js portal service
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── models/        # Data models
│   │   ├── utils/         # Helper functions
│   │   └── routes.js      # Route definitions
│   └── views/             # EJS templates
├── ad-service/       # Python ad service
│   ├── src/
│   └── templates/
└── radius/           # FreeRADIUS config
```

## Areas Needing Help

### High Priority
- [ ] Complete ad service implementation
- [ ] Add comprehensive test suite
- [ ] Implement monitoring dashboards
- [ ] Write user documentation

### Good First Issues
- [ ] Add input validation to forms
- [ ] Improve error messages
- [ ] Add loading states to UI
- [ ] Document API endpoints

### Feature Requests
- [ ] Multi-language support
- [ ] SMS authentication option
- [ ] Premium tier with longer sessions
- [ ] Mobile app development

## Questions?

Feel free to open an issue with the "question" label or reach out on our Discord server.

Thank you for contributing! 🎉
