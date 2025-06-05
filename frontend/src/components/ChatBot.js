import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Fab,
  Drawer,
  CircularProgress
} from '@mui/material';
import {
  Send as SendIcon,
  Chat as ChatIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const ChatBot = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { text: 'Hello! I am your healthcare assistant. How can I help you today?', sender: 'bot' }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { getAuthHeaders } = useAuth();

  // Request a CSRF token when the component mounts
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        // Make a request to the CSRF token endpoint
        await axios.get('/api/csrf-token/', { withCredentials: true });
        console.log('CSRF token cookie has been set');
      } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
      }
    };

    fetchCsrfToken();
  }, []);

  const toggleDrawer = () => {
    setOpen(!open);
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Use axios instance directly from axiosConfig which handles auth properly
      const axiosInstance = await import('../utils/axiosConfig').then(module => module.default);
      
      // Make the request using the configured axios instance
      const response = await axiosInstance.post('/api/patient/chatbot/', { 
        message: input 
      });

      console.log('Chatbot API response:', response);
      if (response.data && response.data.response) {
        setMessages(prev => [...prev, { text: response.data.response, sender: 'bot' }]);
      } else {
        throw new Error('Invalid response format from chatbot API');
      }
    } catch (error) {
      console.error('Error sending message to chatbot:', error);
      
      // Get user-friendly error message from the error
      let errorMessage = 'Something went wrong. Please try again later.';
      if (error.response) {
        console.log('Error response data:', error.response.data);
        console.log('Error response status:', error.response.status);
        errorMessage = error.response.data.detail || 
                      (error.response.data.response || errorMessage);
      }
      
      setMessages(prev => [...prev, { 
        text: `Sorry, I encountered an error: ${errorMessage}`, 
        sender: 'bot' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const drawerContent = (
    <Box sx={{ width: 320, p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="div">
          Healthcare Assistant
        </Typography>
        <IconButton onClick={toggleDrawer} edge="end">
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      
      <Box sx={{ flexGrow: 1, overflow: 'auto', my: 2 }}>
        <List>
          {messages.map((message, index) => (
            <ListItem
              key={index}
              sx={{
                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                mb: 1,
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 1.5,
                  maxWidth: '80%',
                  bgcolor: message.sender === 'user' ? 'primary.light' : 'grey.100',
                  color: message.sender === 'user' ? 'white' : 'text.primary',
                  borderRadius: message.sender === 'user' 
                    ? '16px 16px 0 16px' 
                    : '16px 16px 16px 0',
                }}
              >
                <Typography variant="body2">{message.text}</Typography>
              </Paper>
            </ListItem>
          ))}
          {loading && (
            <ListItem sx={{ justifyContent: 'flex-start', mb: 1 }}>
              <CircularProgress size={24} />
            </ListItem>
          )}
          <div ref={messagesEndRef} />
        </List>
      </Box>
      
      <Box sx={{ mt: 'auto', pt: 2 }}>
        <Divider />
        <Box sx={{ display: 'flex', mt: 2 }}>
          <TextField
            fullWidth
            placeholder="Type a message..."
            variant="outlined"
            size="small"
            value={input}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <IconButton 
            color="primary" 
            onClick={sendMessage} 
            disabled={!input.trim() || loading}
            sx={{ ml: 1 }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );

  return (
    <>
      <Fab
        color="primary"
        aria-label="chat"
        onClick={toggleDrawer}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000,
        }}
      >
        <ChatIcon />
      </Fab>

      <Drawer
        anchor="right"
        open={open}
        onClose={toggleDrawer}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default ChatBot; 