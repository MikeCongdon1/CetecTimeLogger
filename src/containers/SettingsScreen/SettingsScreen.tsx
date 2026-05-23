import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Clipboard,
  ActivityIndicator,
  Platform,
} from 'react-native';
// QRCode only available on native platforms
let QRCode: any = null;
if (Platform.OS !== 'web') {
  QRCode = require('react-native-qrcode-svg').default;
}
import { Colors, Typography, Spacing } from '../../theme';
import { FilterChips } from '../../components';
import * as tokenStorage from '../../utils/tokenStorage';
import * as cetecConfig from '../../utils/cetecConfig';
import * as oauthApi from '../../utils/oauthApi';
import dbService from '../../utils/database';

interface AuthSession {
  shortCode: string;
  qrCodeUrl: string;
  deepLink: string;
  expiresIn: number;
}

interface SettingsScreenProps {
  oauthDeepLinkData?: { shortCode: string } | null;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ oauthDeepLinkData }) => {
  const isDark = useColorScheme() === 'dark';
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempted, setConnectionAttempted] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [activeTab, setActiveTab] = useState<'qr' | 'shortcode' | 'manual'>('shortcode');
  const [connectedUser, setConnectedUser] = useState<string | null>(null);
  const [cetecUrl, setCetecUrl] = useState('');
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'shortcode' | 'browser' | 'manual'>('shortcode');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);
  const [tempClientId, setTempClientId] = useState('');
  const [tempClientSecret, setTempClientSecret] = useState('');

  // Load connected state and CetecERP URL on mount
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        // Check for tokens in secure storage first
        const tokens = await tokenStorage.getTokens();

        // Also check for refresh token in database (for manual entry stored keys)
        const refreshToken = await dbService.getSetting('refreshToken');

        if (tokens || refreshToken) {
          setIsConnected(true);
          setConnectionAttempted(true); // Mark that we have an established connection

          // Try to fetch and set the user name from the stored data
          const savedUser = await dbService.getSetting('connectedUser');
          if (savedUser) {
            setConnectedUser(savedUser);
          } else {
            setConnectedUser('User');
          }
        }

        // Load URL from database
        const savedUrl = await dbService.getSetting('cetecUrl');
        if (savedUrl) {
          setCetecUrl(savedUrl);
          setTempUrl(savedUrl);
        }

        // Load client credentials
        const savedClientId = await cetecConfig.getClientId();
        const savedClientSecret = await cetecConfig.getClientSecret();
        if (savedClientId) setClientId(savedClientId);
        if (savedClientSecret) setClientSecret(savedClientSecret);
      } catch (error) {
        console.error('Error loading initial state:', error);
      }
    };
    loadInitialState();
  }, []);

  // Handle deep link data from CetecERP
  useEffect(() => {
    if (oauthDeepLinkData?.shortCode) {
      console.log('Deep link OAuth code received:', oauthDeepLinkData.shortCode);
      setManualCode(oauthDeepLinkData.shortCode);
      setActiveTab('manual');
    }
  }, [oauthDeepLinkData]);

  /**
   * OPTION 1: Server generates code, user enters it in CetecERP
   * Best for: Both mobile and web when user is in CetecERP browser
   */
  const handleOption1_ServerGeneratedCode = async () => {
    if (!cetecUrl) {
      Alert.alert('Configuration Required', 'Please configure your CetecERP URL first.');
      setIsEditingUrl(true);
      return;
    }

    setIsLoading(true);
    try {
      // Call server to generate OAuth session
      const session = await oauthApi.initiateServerGeneratedCode();
      
      setAuthSession({
        shortCode: session.shortCode,
        qrCodeUrl: '',
        deepLink: session.deepLink,
        expiresIn: session.expiresIn,
      });
      
      setActiveTab('shortcode');
      console.log('OAuth session initiated, user needs to verify in CetecERP');
    } catch (error) {
      Alert.alert('Error', 'Failed to initiate connection. Please try again.');
      console.error('Option 1 error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * OPTION 2: Open CetecERP login in browser, deep link back to app
   * Best for: Web and when you want seamless browser-based OAuth flow
   */
  const handleOption2_BrowserOAuth = async () => {
    if (!cetecUrl) {
      Alert.alert('Configuration Required', 'Please configure your CetecERP URL first.');
      setIsEditingUrl(true);
      return;
    }

    setIsLoading(true);
    try {
      // On mobile: use Linking.openURL or InAppBrowser
      // On web: window.location.href
      
      let redirectUri = 'cetec://oauth/'; // Mobile redirect
      if (Platform.OS === 'web') {
        redirectUri = window.location.origin + '/oauth-callback';
      }
      
      const authUrl = await oauthApi.initiateBrowserOAuth(redirectUri);
      
      // TODO: Open URL in browser
      // if (Platform.OS === 'web') {
      //   window.location.href = authUrl;
      // } else {
      //   Linking.openURL(authUrl);
      // }
      
      console.log('Browser OAuth URL:', authUrl);
      Alert.alert('Opening CetecERP', 'Your browser will open to complete authentication.');
    } catch (error) {
      Alert.alert('Error', 'Failed to open authentication. Please try again.');
      console.error('Option 2 error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * OPTION 3: User manually copies code from CetecERP and pastes here
   * Best for: Fallback when other methods don't work
   */
  const handleOption3_ManualCode = async () => {
    if (!cetecUrl) {
      Alert.alert('Configuration Required', 'Please configure your CetecERP URL first.');
      setIsEditingUrl(true);
      return;
    }

    if (!manualCode.trim()) {
      Alert.alert('Error', 'Please paste or enter a code');
      return;
    }

    setIsLoading(true);
    try {
      // Verify the code with backend
      const tokenData = await oauthApi.verifyManualAuthCode(manualCode);
      
      // Store tokens securely
      await tokenStorage.saveTokens({
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: Date.now() + (tokenData.expiresIn * 1000),
        tokenType: tokenData.tokenType,
      });

      // Store the refresh token (manual code) to database for OAuth authentication
      await dbService.setSetting('refreshToken', manualCode);

      // Set connected state immediately so key persists
      setIsConnected(true);
      setConnectionAttempted(true);
      setAuthSession(null);
      setManualCode('');
      
      // Fetch user info from API (best effort - doesn't block on failure)
      let connectedUserName = 'User';
      try {
        const userResponse = await fetch(`${cetecUrl}/goapis/api/v1/user/me`, {
          headers: {
            'Authorization': `Bearer ${tokenData.accessToken}`,
          },
        });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          connectedUserName = userData.username || userData.email || 'User';
          setConnectedUser(connectedUserName);
          // Persist the user name
          await dbService.setSetting('connectedUser', connectedUserName);
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
        // User stays connected even if API call fails
        setConnectedUser(connectedUserName);
        await dbService.setSetting('connectedUser', connectedUserName);
      }
      Alert.alert('Success', 'Connected to CetecERP!');
      console.log('Successfully verified and stored tokens');
    } catch (error) {
      Alert.alert('Error', 'Invalid code. Please try again.');
      console.error('Option 3 error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStoreKeyOnly = async () => {
    if (!manualCode.trim()) {
      Alert.alert('Error', 'Please paste or enter a code');
      return;
    }

    try {
      // Store the refresh token (manual code) to database without verification
      await dbService.setSetting('refreshToken', manualCode);
      
      // Set connected state
      setIsConnected(true);
      setConnectionAttempted(true);
      setAuthSession(null);
      setManualCode('');
      setConnectedUser('User');
      
      // Persist the user name for future loads
      await dbService.setSetting('connectedUser', 'User');
      
      Alert.alert('Success', 'Key stored successfully');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to store key');
    }
  };

  const handleAttemptConnection = async () => {
    if (!cetecUrl) {
      Alert.alert('Configuration Required', 'Please configure your CetecERP URL first.');
      setIsEditingUrl(true);
      return;
    }

    setIsLoading(true);
    try {
      // Get the stored refresh token
      const refreshToken = await dbService.getSetting('refreshToken');
      if (!refreshToken) {
        Alert.alert('Error', 'No stored key found. Please store the key first.');
        setIsLoading(false);
        return;
      }

      /**
       * Call /goapis/api/v1/user/me with the refresh token.
       * The middleware's APIGetOAuthToken function will validate the token.
       * 
       * How it works (per api.go):
       * - The middleware checks for OAuth tokens via APIGetOAuthToken()
       * - Looks for tokens in cookies first (access_token, refresh_token)
       * - Falls back to Authorization header with Bearer format: "Bearer <token>"
       * - Validates token expiration and checks if revoked
       * - If needed, automatically refreshes expired tokens using refresh_token
       * 
       * Using Authorization header with Bearer format as per api.go implementation
       */
      const userResponse = await fetch(`${cetecUrl}/goapis/api/v1/user/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        const userName = userData.username || userData.email || 'User';
        setConnectedUser(userName);
        setIsConnected(true);
        setConnectionAttempted(true);
        setManualCode('');
        
        // Store the refresh token and user name for future use
        await dbService.setSetting('refreshToken', refreshToken);
        await dbService.setSetting('connectedUser', userName);
        
        Alert.alert('Success', `Connected as ${userName}`);
      } else if (userResponse.status === 401) {
        setConnectionAttempted(false);
        setIsConnected(false);
        Alert.alert('Error', 'Invalid token. The key may have expired. Please generate a new one.');
      } else {
        setConnectionAttempted(false);
        setIsConnected(false);
        const errorText = await userResponse.text();
        console.error('Server error:', errorText);
        Alert.alert('Error', 'Failed to authenticate. Please check your key and CetecERP URL.');
      }
    } catch (error) {
      setConnectionAttempted(false);
      setIsConnected(false);
      console.error('Connection attempt error:', error);
      Alert.alert('Error', 'Connection failed. Please check your CetecERP URL and internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCetecUrl = async () => {
    try {
      await dbService.setSetting('cetecUrl', tempUrl);
      setCetecUrl(tempUrl);
      setIsEditingUrl(false);
      Alert.alert('Success', 'CetecERP URL saved successfully');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save URL');
    }
  };

  const handleCancelUrlEdit = () => {
    setTempUrl(cetecUrl);
    setIsEditingUrl(false);
  };

  const handleSaveClientCredentials = async () => {
    try {
      await cetecConfig.saveClientId(tempClientId);
      await cetecConfig.saveClientSecret(tempClientSecret);
      setClientId(tempClientId);
      setClientSecret(tempClientSecret);
      setIsEditingCredentials(false);
      Alert.alert('Success', 'Client credentials saved');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save credentials');
    }
  };

  const handleCancelCredentialsEdit = () => {
    setTempClientId(clientId);
    setTempClientSecret(clientSecret);
    setIsEditingCredentials(false);
  };

  const handleCopyShortCode = async () => {
    if (authSession?.shortCode) {
      await Clipboard.setString(authSession.shortCode);
      Alert.alert('Copied', 'Short code copied to clipboard');
    }
  };

  const handleManualPaste = async () => {
    const clipboardContent = await Clipboard.getString();
    setManualCode(clipboardContent);
  };

  const handleDisconnect = async () => {
    Alert.alert('Disconnect', 'Are you sure you want to disconnect from CetecERP?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Disconnect',
        onPress: async () => {
          try {
            await tokenStorage.clearTokens();
            setIsConnected(false);
            setAuthSession(null);
            setConnectedUser(null);
            Alert.alert('Disconnected', 'You have been disconnected from CetecERP.');
            console.log('Disconnected and tokens cleared');
          } catch (error) {
            Alert.alert('Error', 'Failed to disconnect');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: isDark ? Colors.backgroundDark : Colors.backgroundLight,
        },
      ]}
    >
      <View style={styles.flexContainer}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDark ? Colors.textPrimaryDark : Colors.textPrimary }]}>
            ⚙️ Settings
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? Colors.textSecondaryDark : Colors.textSecondary }]}>
            Configure CetecERP connection
          </Text>
        </View>

        {/* CetecERP URL Configuration Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? Colors.text : Colors.textDark }]}>
CetecERP URL Configuration
          </Text>

          {!isEditingUrl ? (
            <View
              style={[
                styles.card,
                { backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight },
              ]}
            >
              {cetecUrl ? (
                <>
                  <Text
                    style={[
                      styles.urlLabel,
                      { color: isDark ? Colors.textSecondary : Colors.textTertiary },
                    ]}
                  >
                    Configured URL
                  </Text>
                  <Text
                    style={[
                      styles.urlValue,
                      { color: isDark ? Colors.text : Colors.textDark },
                    ]}
                  >
                    {cetecUrl}
                  </Text>
                </>
              ) : (
                <Text
                  style={[
                    styles.cardDescription,
                    { color: isDark ? Colors.textSecondary : Colors.textTertiary },
                  ]}
                >
                  No CetecERP instance configured. Configure one to start connecting.
                </Text>
              )}

              <TouchableOpacity
                style={[styles.button, { backgroundColor: Colors.primary, marginTop: Spacing.md }]}
                onPress={() => {
                  setTempUrl(cetecUrl);
                  setIsEditingUrl(true);
                }}
              >
                <Text style={[styles.buttonText, { color: Colors.text }]}>
                  {cetecUrl ? 'Change URL' : 'Configure URL'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={[
                styles.card,
                { backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight },
              ]}
            >
              <Text
                style={[
                  styles.inputLabel,
                  { color: isDark ? Colors.text : Colors.textDark },
                ]}
              >
                CetecERP Server URL
              </Text>
              <Text
                style={[
                  styles.inputHint,
                  { color: isDark ? Colors.textSecondary : Colors.textTertiary },
                ]}
              >
                Example: http://l418.cetecerpdevel.com:3030
              </Text>

              <TextInput
                style={[
                  styles.urlInput,
                  {
                    backgroundColor: isDark ? Colors.backgroundDark : Colors.backgroundLight,
                    color: isDark ? Colors.text : Colors.textDark,
                    borderColor: Colors.borderColor,
                  },
                ]}
                placeholder="Enter your CetecERP URL"
                placeholderTextColor={Colors.textSecondary}
                value={tempUrl}
                onChangeText={setTempUrl}
                autoCapitalize="none"
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.halfButton,
                    { backgroundColor: Colors.primary, marginRight: Spacing.sm },
                  ]}
                  onPress={handleSaveCetecUrl}
                >
                  <Text style={[styles.buttonText, { color: Colors.text }]}>Save</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.halfButton,
                    {
                      backgroundColor: isDark ? Colors.surfaceDark : Colors.backgroundLight,
                      borderWidth: 1,
                      borderColor: Colors.borderColor,
                    },
                  ]}
                  onPress={handleCancelUrlEdit}
                >
                  <Text style={[styles.buttonText, { color: isDark ? Colors.text : Colors.textDark }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* OAuth Client Credentials Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? Colors.text : Colors.textDark }]}>
            OAuth Client Credentials
          </Text>

          {!isEditingCredentials ? (
            <View
              style={[
                styles.card,
                { backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight },
              ]}
            >
              {clientId ? (
                <>
                  <Text
                    style={[
                      styles.urlLabel,
                      { color: isDark ? Colors.textSecondary : Colors.textTertiary },
                    ]}
                  >
                    Client ID
                  </Text>
                  <Text
                    style={[
                      styles.urlValue,
                      { color: isDark ? Colors.text : Colors.textDark },
                    ]}
                  >
                    {clientId}
                  </Text>
                  {clientSecret ? (
                    <>
                      <Text
                        style={[
                          styles.urlLabel,
                          { color: isDark ? Colors.textSecondary : Colors.textTertiary },
                        ]}
                      >
                        Client Secret
                      </Text>
                      <Text
                        style={[
                          styles.urlValue,
                          { color: isDark ? Colors.text : Colors.textDark },
                        ]}
                      >
                        {'•'.repeat(Math.min(clientSecret.length, 24))}
                      </Text>
                    </>
                  ) : null}
                </>
              ) : (
                <Text
                  style={[
                    styles.cardDescription,
                    { color: isDark ? Colors.textSecondary : Colors.textTertiary },
                  ]}
                >
                  Optional. Enter your registered OAuth client ID and secret from CetecERP. If not set, a default client ID is used.
                </Text>
              )}

              <TouchableOpacity
                style={[styles.button, { backgroundColor: Colors.primary, marginTop: Spacing.md }]}
                onPress={() => {
                  setTempClientId(clientId);
                  setTempClientSecret(clientSecret);
                  setIsEditingCredentials(true);
                }}
              >
                <Text style={[styles.buttonText, { color: Colors.text }]}>
                  {clientId ? 'Edit Credentials' : 'Set Credentials'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={[
                styles.card,
                { backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight },
              ]}
            >
              <Text
                style={[
                  styles.inputLabel,
                  { color: isDark ? Colors.text : Colors.textDark },
                ]}
              >
                Client ID
              </Text>
              <Text
                style={[
                  styles.inputHint,
                  { color: isDark ? Colors.textSecondary : Colors.textTertiary },
                ]}
              >
                The client ID registered in CetecERP for this app
              </Text>
              <TextInput
                style={[
                  styles.urlInput,
                  {
                    backgroundColor: isDark ? Colors.backgroundDark : Colors.backgroundLight,
                    color: isDark ? Colors.text : Colors.textDark,
                    borderColor: Colors.borderColor,
                  },
                ]}
                placeholder="Enter Client ID"
                placeholderTextColor={Colors.textSecondary}
                value={tempClientId}
                onChangeText={setTempClientId}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text
                style={[
                  styles.inputLabel,
                  { color: isDark ? Colors.text : Colors.textDark, marginTop: Spacing.md },
                ]}
              >
                Client Secret
              </Text>
              <Text
                style={[
                  styles.inputHint,
                  { color: isDark ? Colors.textSecondary : Colors.textTertiary },
                ]}
              >
                The client secret for your registered OAuth app
              </Text>
              <TextInput
                style={[
                  styles.urlInput,
                  {
                    backgroundColor: isDark ? Colors.backgroundDark : Colors.backgroundLight,
                    color: isDark ? Colors.text : Colors.textDark,
                    borderColor: Colors.borderColor,
                  },
                ]}
                placeholder="Enter Client Secret"
                placeholderTextColor={Colors.textSecondary}
                value={tempClientSecret}
                onChangeText={setTempClientSecret}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.halfButton,
                    { backgroundColor: Colors.primary, marginRight: Spacing.sm },
                  ]}
                  onPress={handleSaveClientCredentials}
                >
                  <Text style={[styles.buttonText, { color: Colors.text }]}>Save</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.halfButton,
                    {
                      backgroundColor: isDark ? Colors.surfaceDark : Colors.backgroundLight,
                      borderWidth: 1,
                      borderColor: Colors.borderColor,
                    },
                  ]}
                  onPress={handleCancelCredentialsEdit}
                >
                  <Text style={[styles.buttonText, { color: isDark ? Colors.text : Colors.textDark }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ERP Connection Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? Colors.text : Colors.textDark }]}>
            Connection Status
          </Text>

          {!isConnected && !authSession ? (
            /* Initial State - Not Connected - Chip Selection */
            <View style={styles.optionsContainer}>
              <View
                style={[
                  styles.card,
                  { backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight },
                ]}
              >
                <View style={styles.connectionStatus}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: '#ef4444' }, // red for disconnected
                    ]}
                  />
                  <Text style={[styles.statusText, { color: Colors.textSecondary }]}>
                    Not Connected
                  </Text>
                </View>

                <Text
                  style={[
                    styles.cardDescription,
                    { color: isDark ? Colors.textSecondary : Colors.textTertiary },
                  ]}
                >
                  Choose how you'd like to connect to CetecERP:
                </Text>

                {/* Connection Method Selection */}
                <FilterChips
                  chips={['Short Code', 'Browser', 'Manual']}
                  selectedChip={
                    selectedMethod === 'shortcode'
                      ? 'Short Code'
                      : selectedMethod === 'browser'
                        ? 'Browser'
                        : 'Manual'
                  }
                  onChipPress={(chip) => {
                    if (chip === 'Short Code') setSelectedMethod('shortcode');
                    else if (chip === 'Browser') setSelectedMethod('browser');
                    else setSelectedMethod('manual');
                  }}
                  style={styles.filterChipsContainer}
                />
              </View>

              {/* SHORT CODE METHOD */}
              {selectedMethod === 'shortcode' && (
                <View
                  style={[
                    styles.optionCard,
                    { backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight, marginTop: Spacing.xl },
                  ]}
                >
                  <Text style={[styles.optionTitle, { color: isDark ? Colors.text : Colors.textDark }]}>
                    Short Code
                  </Text>
                  <Text
                    style={[
                      styles.optionDescription,
                      { color: isDark ? Colors.textSecondary : Colors.textTertiary },
                    ]}
                  >
                    Get a code and enter it in your CetecERP settings. Works on any platform.
                  </Text>
                  <TouchableOpacity
                    style={[styles.optionButton, { backgroundColor: Colors.primary }]}
                    onPress={handleOption1_ServerGeneratedCode}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={[styles.buttonText, { color: 'white' }]}>
                        Get Code
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* BROWSER METHOD */}
              {selectedMethod === 'browser' && (
                <View
                  style={[
                    styles.optionCard,
                    { backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight, marginTop: Spacing.xl },
                  ]}
                >
                  <Text style={[styles.optionTitle, { color: isDark ? Colors.text : Colors.textDark }]}>
                    Browser Login
                  </Text>
                  <Text
                    style={[
                      styles.optionDescription,
                      { color: isDark ? Colors.textSecondary : Colors.textTertiary },
                    ]}
                  >
                    Opens CetecERP in your browser for seamless authentication. Recommended on web.
                  </Text>
                  <TouchableOpacity
                    style={[styles.optionButton, { backgroundColor: '#3b82f6' }]}
                    onPress={handleOption2_BrowserOAuth}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={[styles.buttonText, { color: 'white' }]}>
                        Open Browser
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* MANUAL METHOD */}
              {selectedMethod === 'manual' && (
                <View
                  style={[
                    styles.optionCard,
                    { backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight, marginTop: Spacing.xl },
                  ]}
                >
                  <Text style={[styles.optionTitle, { color: isDark ? Colors.text : Colors.textDark }]}>
                    Manual Entry
                  </Text>
                  <Text
                    style={[
                      styles.optionDescription,
                      { color: isDark ? Colors.textSecondary : Colors.textTertiary },
                    ]}
                  >
                    Paste a generated code from the user profile in CetecERP. Use this as a fallback if other methods don't work.
                  </Text>

                  <TextInput
                    style={[
                      styles.manualInput,
                      {
                        backgroundColor: isDark ? Colors.backgroundDark : Colors.backgroundLight,
                        color: isDark ? Colors.text : Colors.textDark,
                        borderColor: Colors.borderColor,
                      },
                    ]}
                    placeholder="Paste code here..."
                    placeholderTextColor={Colors.textSecondary}
                    value={manualCode}
                    onChangeText={setManualCode}
                    editable={!isLoading}
                  />

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.halfButton, { backgroundColor: '#10b981' }]}
                      onPress={handleStoreKeyOnly}
                      disabled={isLoading || !manualCode.trim()}
                    >
                      <Text style={[styles.buttonText, { color: 'white' }]}>
                        Store Key
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.halfButton, { backgroundColor: '#8b5cf6', marginRight: Spacing.sm }]}
                      onPress={handleAttemptConnection}
                      disabled={isLoading || !manualCode.trim()}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text style={[styles.buttonText, { color: 'white' }]}>
                          Attempt Connection
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ) : connectionAttempted && isConnected ? (
            /* Connection Successful */
            <View
              style={[
                styles.card,
                { backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight },
              ]}
            >
              <View style={styles.connectionStatus}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: '#10b981' }, // green for connected
                  ]}
                />
                <Text style={[styles.statusText, { color: '#10b981' }]}>
                  Connection Successful
                </Text>
              </View>

              <View style={styles.connectedInfo}>
                <Text style={[styles.connectedLabel, { color: isDark ? Colors.textSecondary : Colors.textTertiary }]}>
                  Connected as
                </Text>
                <Text style={[styles.connectedUser, { color: isDark ? Colors.text : Colors.textDark }]}>
                  {connectedUser || 'User'}
                </Text>
              </View>

              <Text
                style={[
                  styles.cardDescription,
                  { color: isDark ? Colors.textSecondary : Colors.textTertiary },
                ]}
              >
                Your key is authenticated and ready. Time entries will sync automatically.
              </Text>
            </View>
          ) : (
            /* OAuth Session Active */
            <View
              style={[
                styles.card,
                { backgroundColor: isDark ? Colors.surfaceDark : Colors.surfaceLight },
              ]}
            >
              {/* Tabs */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeTab === 'shortcode' && styles.activeTab,
                    {
                      borderBottomColor:
                        activeTab === 'shortcode' ? Colors.primary : Colors.borderColor,
                    },
                  ]}
                  onPress={() => setActiveTab('shortcode')}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: activeTab === 'shortcode' ? Colors.primary : Colors.textSecondary,
                      },
                    ]}
                  >
                    Short Code
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeTab === 'qr' && styles.activeTab,
                    {
                      borderBottomColor:
                        activeTab === 'qr' ? Colors.primary : Colors.borderColor,
                    },
                  ]}
                  onPress={() => setActiveTab('qr')}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: activeTab === 'qr' ? Colors.primary : Colors.textSecondary,
                      },
                    ]}
                  >
                    QR Code
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeTab === 'manual' && styles.activeTab,
                    {
                      borderBottomColor:
                        activeTab === 'manual' ? Colors.primary : Colors.borderColor,
                    },
                  ]}
                  onPress={() => setActiveTab('manual')}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: activeTab === 'manual' ? Colors.primary : Colors.textSecondary,
                      },
                    ]}
                  >
                    Manual
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tab Content */}
              {activeTab === 'shortcode' && (
                <View style={styles.tabContent}>
                  <Text
                    style={[
                      styles.instructionText,
                      { color: isDark ? Colors.textSecondary : Colors.textTertiary },
                    ]}
                  >
                    Enter this code on your CetecERP user settings page:
                  </Text>

                  <View
                    style={[
                      styles.shortCodeBox,
                      { backgroundColor: isDark ? Colors.backgroundDark : Colors.backgroundLight },
                    ]}
                  >
                    <Text
                      style={[
                        styles.shortCode,
                        { color: isDark ? Colors.text : Colors.textDark },
                      ]}
                    >
                      {authSession?.shortCode}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: Colors.primary }]}
                    onPress={handleCopyShortCode}
                  >
                    <Text style={[styles.secondaryButtonText, { color: Colors.primary }]}>
                      Copy Code
                    </Text>
                  </TouchableOpacity>

                  <Text style={[styles.expiryText, { color: Colors.textTertiary }]}>
                    Expires in {authSession?.expiresIn} seconds
                  </Text>
                </View>
              )}

              {activeTab === 'qr' && (
                <View style={styles.tabContent}>
                  <Text
                    style={[
                      styles.instructionText,
                      { color: isDark ? Colors.textSecondary : Colors.textTertiary },
                    ]}
                  >
                    Scan this QR code with your CetecERP account:
                  </Text>

                  <View
                    style={[
                      styles.qrCodeContainer,
                      { backgroundColor: 'white' },
                    ]}
                  >
                    {authSession && QRCode && (
                      <QRCode
                        value={`cetec://oauth/${authSession.shortCode}`}
                        size={200}
                        color={Colors.textDark}
                        backgroundColor="white"
                      />
                    )}
                    {authSession && !QRCode && (
                      <Text style={[styles.instructionText, { color: Colors.textSecondary, textAlign: 'center' }]}>
                        QR codes not available on web. Use the deep link or manual code entry below.
                      </Text>
                    )}
                  </View>

                  <Text style={[styles.expiryText, { color: Colors.textTertiary }]}>
                    Expires in {authSession?.expiresIn} seconds
                  </Text>
                </View>
              )}

              {activeTab === 'manual' && (
                <View style={styles.tabContent}>
                  <Text
                    style={[
                      styles.instructionText,
                      { color: isDark ? Colors.textSecondary : Colors.textTertiary },
                    ]}
                  >
                    Paste the code from your CetecERP user settings page:
                  </Text>

                  <TextInput
                    style={[
                      styles.manualInput,
                      {
                        backgroundColor: isDark ? Colors.backgroundDark : Colors.backgroundLight,
                        color: isDark ? Colors.text : Colors.textDark,
                        borderColor: Colors.borderColor,
                      },
                    ]}
                    placeholder="Paste code here..."
                    placeholderTextColor={Colors.textSecondary}
                    value={manualCode}
                    onChangeText={setManualCode}
                    editable={!isLoading}
                  />

                  <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: Colors.textSecondary }]}
                    onPress={handleManualPaste}
                  >
                    <Text style={[styles.secondaryButtonText, { color: Colors.textSecondary }]}>
                      Paste from Clipboard
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.halfButton, { backgroundColor: '#10b981' }]}
                      onPress={handleStoreKeyOnly}
                      disabled={isLoading || !manualCode.trim()}
                    >
                      <Text style={[styles.buttonText, { color: 'white' }]}>
                        Store Key
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.halfButton, { backgroundColor: Colors.primary, marginRight: Spacing.sm }]}
                      onPress={handleAttemptConnection}
                      disabled={isLoading || !manualCode.trim()}
                    >
                      {isLoading ? (
                        <ActivityIndicator color={Colors.text} />
                      ) : (
                        <Text style={[styles.buttonText, { color: Colors.text }]}>
                          Attempt Connection
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Other Settings Sections */}
        <View style={styles.section}>
        </View>
      </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  flexContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  title: {
    ...Typography.headlineSmall,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: Spacing.xl,
    marginTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
  },
  sectionTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    marginBottom: Spacing.md,
    fontSize: 16,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  urlLabel: {
    ...Typography.bodyMedium,
    fontSize: 12,
    marginBottom: Spacing.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  urlValue: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    fontSize: 16,
    marginBottom: Spacing.md,
    fontFamily: 'Menlo',
  },
  inputLabel: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    fontSize: 14,
    marginBottom: Spacing.sm,
    letterSpacing: 0.2,
  },
  inputHint: {
    ...Typography.bodyMedium,
    fontSize: 12,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  filterChipsContainer: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
    marginHorizontal: -Spacing.lg,
  },
  urlInput: {
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xl,
    borderWidth: 1.5,
    marginBottom: Spacing.md,
    fontSize: 14,
    fontWeight: '500',
    minHeight: 54,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    minHeight: 54,
  },
  optionsContainer: {
    gap: Spacing.xl,
    marginTop: Spacing.lg,
  },
  optionCard: {
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.borderColor,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  optionTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: Spacing.sm,
  },
  optionDescription: {
    ...Typography.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  optionButton: {
    borderRadius: 12,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  connectedInfo: {
    marginVertical: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderColor,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
  },
  connectedLabel: {
    ...Typography.bodyMedium,
    fontSize: 12,
    marginBottom: Spacing.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  connectedUser: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    fontSize: 16,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
    backgroundColor: '#4CAF50',
  },
  statusText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    fontSize: 13,
    color: '#4CAF50',
  },
  cardDescription: {
    ...Typography.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  button: {
    borderRadius: 12,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    minHeight: 54,
  },
  buttonText: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    fontSize: 15,
    color: '#fff',
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginVertical: Spacing.md,
    backgroundColor: 'transparent',
    minHeight: 54,
  },
  secondaryButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    fontSize: 14,
    color: Colors.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: Colors.borderColor,
    marginBottom: Spacing.lg,
    backgroundColor: 'transparent',
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    alignItems: 'center',
  },
  activeTab: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    fontSize: 13,
  },
  tabContent: {
    gap: Spacing.md,
  },
  instructionText: {
    ...Typography.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  shortCodeBox: {
    borderRadius: 16,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(33, 150, 243, 0.05)',
    marginBottom: Spacing.md,
    minHeight: 120,
  },
  shortCode: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    fontSize: 32,
    fontFamily: 'monospace',
    letterSpacing: 4,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  qrCodeContainer: {
    height: 260,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.borderColor,
    backgroundColor: '#fff',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  manualInput: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    minHeight: 160,
    textAlignVertical: 'top',
    ...Typography.bodyMedium,
    fontSize: 13,
    fontWeight: '500',
  },
  expiryText: {
    ...Typography.labelSmall,
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  settingLabel: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    fontSize: 14,
  },
  settingDescription: {
    ...Typography.bodyMedium,
    fontSize: 12,
    lineHeight: 18,
  },
});
