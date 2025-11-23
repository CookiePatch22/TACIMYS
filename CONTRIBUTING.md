# Contributing to "Take A Coffee I'm Monitoring Your Services"

First off, thank you for considering contributing to our project! It's people like you that make this project such a great tool. Whether you're reporting bugs, suggesting features, or writing code, your contribution is valued.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and constructive in all interactions.

## How to Contribute

### 1. Reporting Bugs

Found a bug? Here's how to report it:

1. **Check if it's already reported** - Search existing issues to avoid duplicates
2. **Create a detailed report** including:
   - Clear title describing the issue
   - Step-by-step reproduction instructions
   - Expected vs actual behavior
   - Your environment (Node.js version, OS, browser)
   - Any error messages or screenshots

### 2. Suggesting Features

Have an idea to improve the project?

1. **Check existing issues** - Your idea might already be discussed
2. **Open a feature request** with:
   - Clear description of the feature
   - Why it would be useful
   - Possible implementation approach (optional)
   - Example use cases

### 3. Submitting Code Changes

Ready to code? Follow these steps:

#### Setup Your Development Environment

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/NicolasBrg/TACIMYS.git
cd TACIMYS

# Add upstream remote
git remote add upstream https://github.com/NicolasBrg/TACIMYS.git

# Install dependencies
npm install
```

#### Create a Feature Branch

```bash
# Update your local main
git fetch upstream
git checkout main
git merge upstream/main

# Create a feature branch
git checkout -b feature/your-feature-name
# or for bug fixes
git checkout -b fix/bug-description
```

#### Make Your Changes

- Write clean, readable code
- Follow the existing code style and conventions
- Keep commits atomic and meaningful
- Update relevant documentation

#### Test Your Changes

```bash
# Start the development server
npm start

# Test your changes in the browser at http://localhost:3000
# Verify existing functionality still works
```

#### Commit and Push

```bash
# Stage your changes
git add .

# Write a clear, descriptive commit message
git commit -m "Add feature: description of what you added"

# Push to your fork
git push origin feature/your-feature-name
```

#### Open a Pull Request

1. Go to the original repository on GitHub
2. Click "New Pull Request"
3. Select your branch and provide:
   - Clear title (e.g., "Add dark mode toggle")
   - Detailed description of changes
   - Reference related issues (#123)
   - Checklist of what you've tested

## Coding Guidelines

### Style and Conventions

- **JavaScript**: Use ES6+ features where appropriate
- **Indentation**: 2 spaces (configured in .editorconfig)
- **Naming**: Use camelCase for variables/functions, descriptive names
- **Comments**: Add comments for complex logic, keep them concise
- **Formatting**: Keep lines reasonably short and readable

### Example Code Style

```javascript
// Good: Clear naming and structure
async function loadServices() {
  try {
    const response = await fetch(`${API_URL}/services`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to load services');
    const services = await response.json();
    return services;
  } catch (err) {
    console.error('Error loading services:', err);
    throw err;
  }
}

// Avoid: Unclear naming, no error handling
async function ls() {
  const x = await fetch(`${API_URL}/services`, {
    headers: getAuthHeader(),
  });
  return x.json();
}
```

### File Organization

- Keep files focused on single responsibility
- Group related functionality together
- Use clear, descriptive file names
- Organize into logical folders (services/, builders/, utils/, auth/)

## Project Structure Quick Reference

```
├── server.js              # Main Express.js server and API routes
├── index.html            # Main HTML template
├── style.css             # Styling
├── conf.json             # JSON data storage
├── front/
│   ├── auth/            # Authentication related code
│   ├── builders/        # UI component builders
│   ├── services/        # API service clients
│   └── utils/           # Helper utilities
└── assets/              # Static assets (icons, images)
```

## Areas for Contribution

### High Priority
- Bug fixes and stability improvements
- Performance optimizations
- Documentation improvements
- User experience enhancements

### Open Ideas
- Dashboard widgets
- Advanced filtering and search
- Service templates
- Notification system (email, Slack, Discord)
- Export/import functionality
- Mobile app companion
- Dark mode support
- Multi-language support

### Easy to Start
- Documentation fixes
- Adding comments to code
- Creating issue templates
- Improving error messages
- Adding configuration examples

## Development Tips

### Debugging

1. Use browser DevTools (F12) to inspect frontend code
2. Check console for JavaScript errors
3. Use `console.log()` for debugging
4. Node.js debugging: `node --inspect server.js`

### Testing Changes

Always test:
- User registration and login
- Creating/editing/deleting services
- Group management
- Permission checking
- Different service types (HTTP, PING)
- Rule matching with regex patterns

### Common Issues

**Port already in use**
```bash
# Use a different port
PORT=3001 npm start
```

**Module not found**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Pull Request Process

1. **Before submitting**, ensure:
   - Your code follows project style guidelines
   - You've tested your changes thoroughly
   - You've updated documentation if needed
   - Commit messages are clear and descriptive

2. **PR checklist**:
   - [ ] Changes follow code style guidelines
   - [ ] Comments added for complex logic
   - [ ] Documentation updated
   - [ ] No breaking changes (or clearly documented)
   - [ ] Tested in browser

3. **Review process**:
   - Maintainers will review your PR
   - Address feedback and push updates to your branch
   - PRs are merged after approval

## Questions?

- **Usage questions**: Create a GitHub Discussion
- **Implementation questions**: Comment on related issues
- **General inquiries**: Open an issue with [QUESTION] tag

## License

By contributing to this project, you agree that your contributions will be licensed under the same NCSA-CA License as the project.

## Recognition

Contributors will be recognized in:
- Project README
- GitHub contributors page
- Release notes (for significant contributions)

Thank you for making this project better! ☕

---

**Happy coding and thanks for contributing!**
