import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_KEY } from '@env'

const OPENAI_API_KEY = API_KEY;

const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef();

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const loadMessages = async () => {
    try {
      const savedMessages = await AsyncStorage.getItem('messages');
      if (savedMessages !== null) {
        setMessages(JSON.parse(savedMessages));
      }
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
    }
  };

  const saveMessages = async (newMessages) => {
    try {
      await AsyncStorage.setItem('messages', JSON.stringify(newMessages));
    } catch (error) {
      console.error('Error al guardar mensajes:', error);
    }
  };

  const buildOptimizedPrompt = (userInput) => {
    return `Eres una asistente virtual especializada en embarazo y cuidado del bebé, solo responde a este tipo de preguntas. Responde de manera amigable, empática sin alargarte mucho, completa y concisa. Proporciona información precisa basada en evidencia médica actual. Si no estás segura de algo, indícalo claramente. Aquí está la pregunta del usuario: ${userInput}, se breve y optimiza el uso de tokens. Solo recomienda ver al doctor en casa de algo grave y urgente`;
  };

  const sendMessage = async () => {
    if (inputText.trim() === '') return;

    const userMessage = { id: Date.now(), text: inputText, user: true };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    saveMessages(newMessages);

    const optimizedPrompt = buildOptimizedPrompt(inputText);

    try {
      const response = await fetch('openai-url', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: optimizedPrompt }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const botReply = data.choices[0].message.content;
      const botMessage = { id: Date.now() + 1, text: botReply, user: false };
      const updatedMessages = [...newMessages, botMessage];
      setMessages(updatedMessages);
      saveMessages(updatedMessages);
    } catch (error) {
      console.error('Error al obtener respuesta de ChatGPT:', error.message);
      const errorMessage = { id: Date.now() + 1, text: "Lo siento, no pude procesar tu solicitud. Por favor, intenta de nuevo.", user: false };
      setMessages([...newMessages, errorMessage]);
      saveMessages([...newMessages, errorMessage]);
    }
  };

  const renderMessage = ({ item }) => (
    <View style={[styles.messageBubble, item.user ? styles.userBubble : styles.botBubble]}>
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fdd1e7" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.chatContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id.toString()}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
          />
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Escribe tu pregunta aquí..."
            placeholderTextColor="#A0AEC0"
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendButtonText}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eeeeee',
  },
  container: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 1,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 10,
    paddingBottom: 10,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 20,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#e959a0',
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fdacba',
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    backgroundColor: '#EDF2F7',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#e959a0',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChatScreen;