// Language translation dictionary
const translations = {
    en: {
        welcome: "Welcome to West Automotive LLC",
        placeBid: "Place a Bid",
        myBids: "My Bids",
        login: "Login",
        logout: "Logout",
        signup: "Sign Up"
    },
    es: {
        welcome: "Bienvenido a West Automotive LLC",
        placeBid: "Hacer una Oferta",
        myBids: "Mis Ofertas",
        login: "Iniciar Sesión",
        logout: "Cerrar Sesión",
        signup: "Registrarse"
    },
    fr: {
        welcome: "Bienvenue chez West Automotive LLC",
        placeBid: "Faire une Offre",
        myBids: "Mes Offres",
        login: "Connexion",
        logout: "Déconnexion",
        signup: "S'inscrire"
    }
};

// Initialize language
document.addEventListener('DOMContentLoaded', function() {
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.addEventListener('change', function() {
            setLanguage(this.value);
        });
        
        // Set initial language
        const savedLanguage = localStorage.getItem('preferredLanguage') || 'en';
        languageSelect.value = savedLanguage;
        setLanguage(savedLanguage);
    }
});

function setLanguage(language) {
    localStorage.setItem('preferredLanguage', language);
    const elements = document.querySelectorAll('[data-translate]');
    
    elements.forEach(element => {
        const key = element.getAttribute('data-translate');
        if (translations[language] && translations[language][key]) {
            element.textContent = translations[language][key];
        }
    });
}
