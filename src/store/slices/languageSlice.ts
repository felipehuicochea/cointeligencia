import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Language } from '../../i18n';
import { i18n } from '../../i18n';

interface LanguageState {
  currentLanguage: Language;
  isLoading: boolean;
  error: string | null;
}

const initialState: LanguageState = {
  currentLanguage: 'es', // Default to Spanish
  isLoading: false,
  error: null,
};

// Async thunk to change language
export const changeLanguage = createAsyncThunk(
  'language/changeLanguage',
  async (language: Language, { rejectWithValue }) => {
    try {
      await i18n.setLanguage(language);
      return language;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to change language');
    }
  }
);

// Async thunk to initialize language
export const initializeLanguage = createAsyncThunk(
  'language/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const currentLanguage = i18n.getCurrentLanguage();
      return currentLanguage;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to initialize language');
    }
  }
);

const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.currentLanguage = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Change Language
      .addCase(changeLanguage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changeLanguage.fulfilled, (state, action: PayloadAction<Language>) => {
        state.isLoading = false;
        state.currentLanguage = action.payload;
      })
      .addCase(changeLanguage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Initialize Language
      .addCase(initializeLanguage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeLanguage.fulfilled, (state, action: PayloadAction<Language>) => {
        state.isLoading = false;
        state.currentLanguage = action.payload;
      })
      .addCase(initializeLanguage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setLanguage, clearError } = languageSlice.actions;
export default languageSlice.reducer;
