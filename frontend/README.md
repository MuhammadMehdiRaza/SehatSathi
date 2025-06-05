# Sehat Saathi Hospital Management System - Frontend

This is the frontend application for the Sehat Saathi Hospital Management System.

## Setup Instructions

1. Install dependencies:
```
npm install
```

2. Start the development server:
```
npm start
```

## Chatbot Configuration

The patient interface includes a chatbot feature that can be configured to use either:
1. Internal API (default) - Uses the built-in Django backend endpoint
2. External API service - Integrates with external AI services like OpenAI

### Using the Internal API

No additional configuration is required for the internal API. The chatbot will use the Django backend endpoint by default.

### Using an External API (e.g., OpenAI)

To configure the chatbot to use an external API:

1. Create a `.env` file in the frontend root directory with the following content:
```
REACT_APP_USE_EXTERNAL_API=true
REACT_APP_CHATBOT_API_KEY=your_api_key_here
```

2. Replace `your_api_key_here` with your actual API key from the service provider.

3. Restart the development server for the changes to take effect.

### Supported External Services

The current implementation supports:
- OpenAI API (GPT-3.5/GPT-4)

To modify the configuration or add support for other API services, edit the `apiUtils.js` file in the `src/utils` directory.

## License

This project is licensed under the MIT License. 