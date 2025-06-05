from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.http import JsonResponse
import logging
import os
from django.conf import settings
import google.generativeai as genai

# Set up logger
logger = logging.getLogger(__name__)

# Default API key - in production this should be stored in environment variables
GEMINI_API_KEY = getattr(settings, 'GEMINI_API_KEY', 'YOUR_GEMINI_API_KEY_HERE')

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt  # Exempt this view from CSRF protection
def patient_chatbot_view(request):
    """
    API endpoint for the patient chatbot that uses Google's Gemini API.
    
    Expects:
    {
        "message": "User's message"
    }
    
    Returns:
    {
        "response": "AI's response"
    }
    """
    user_message = request.data.get('message', '')
    
    # Log the input for debugging
    logger.info(f"Chatbot received: {user_message}")
    
    if not user_message:
        return Response(
            {'error': 'No message provided'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get API key from settings or environment
    api_key = os.environ.get('GEMINI_API_KEY', GEMINI_API_KEY)
    
    try:
        # Initialize the Gemini client
        genai.configure(api_key=api_key)
        
        # Set up the model
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config={
                "temperature": 0.7,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 150,
            },
            safety_settings=[
                {
                    "category": "HARM_CATEGORY_HATE_SPEECH",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                }
            ],
            system_instruction="You are a helpful healthcare assistant for Sehat Saathi Hospital. Provide concise and helpful responses to patient questions about healthcare, appointments, and hospital services. Keep responses under 100 words."
        )
        
        # Generate content
        response = model.generate_content(user_message)
        
        # Log the response for debugging
        logger.info(f"Gemini response: {response}")
        
        # Extract the text response
        ai_response = response.text
        
        # Store chat in session if needed
        # Simplified for API usage
        if not hasattr(request, 'session'):
            request.session = {}
        
        if 'chat_history' not in request.session:
            request.session['chat_history'] = []
            
        request.session['chat_history'].append({
            'user': user_message,
            'bot': ai_response
        })
        
        if hasattr(request.session, 'modified'):
            request.session.modified = True
        
        return Response({"response": ai_response})
        
    except Exception as e:
        logger.error(f"Error calling Gemini API: {str(e)}")
        error_message = f"Error communicating with AI service: {str(e)}"
        
        # Add to chat history even if error occurs
        if hasattr(request, 'session'):
            if 'chat_history' not in request.session:
                request.session['chat_history'] = []
                
            request.session['chat_history'].append({
                'user': user_message,
                'bot': error_message
            })
            
            if hasattr(request.session, 'modified'):
                request.session.modified = True
        
        return Response(
            {"response": error_message},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def get_csrf_token(request):
    """
    Endpoint to get a CSRF token.
    
    This view doesn't do anything except return a 200 OK response, 
    but the @ensure_csrf_cookie decorator ensures that a CSRF cookie is set.
    The frontend can call this endpoint to get a CSRF cookie.
    """
    return JsonResponse({"detail": "CSRF cookie set"})

@api_view(['OPTIONS'])
@permission_classes([AllowAny])
@csrf_exempt
def chatbot_options(request):
    """
    Handle OPTIONS requests for the chatbot endpoint.
    
    This is necessary for CORS preflight requests.
    """
    return Response(status=status.HTTP_200_OK) 