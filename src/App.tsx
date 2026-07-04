import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AddClothingPage from './pages/AddClothingPage';
import ClothingDetailPage from './pages/ClothingDetailPage';
import OutfitPage from './pages/OutfitPage';
import { AuthProvider } from './contexts/AuthContext';
import AuthGate from './components/AuthGate';

function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <BrowserRouter basename="/magical-closet">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/add" element={<AddClothingPage />} />
            <Route path="/clothing/:id" element={<ClothingDetailPage />} />
            <Route path="/outfit" element={<OutfitPage />} />
          </Routes>
        </BrowserRouter>
      </AuthGate>
    </AuthProvider>
  );
}

export default App;
