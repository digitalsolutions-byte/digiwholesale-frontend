import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import customerRegistrationReducer from './slices/customerRegistrationSlice';
import settingsReducer from './slices/settingsSlice';
import loaderReducer from '../features/loader/loaderSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        customerRegistration: customerRegistrationReducer,
        settings: settingsReducer,
        loader: loaderReducer,
    },
});
