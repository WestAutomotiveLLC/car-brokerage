// global-language.js - Works on ALL pages without HTML changes
const translations = {
    en: {
        // Navigation
        'West Automotive LLC': 'West Automotive LLC',
        'Place Bid': 'Place Bid',
        'My Bids': 'My Bids', 
        'Login': 'Login',
        'Sign Up': 'Sign Up',
        'Logout': 'Logout',
        'Welcome': 'Welcome',
        
        // Main Page
        'Professional Car Brokerage Services': 'Professional Car Brokerage Services',
        'Bid on auction vehicles with expert guidance and competitive pricing': 'Bid on auction vehicles with expert guidance and competitive pricing',
        'Place Your Bid': 'Place Your Bid',
        'Secure Bidding': 'Secure Bidding',
        'Protected deposits and secure payment processing': 'Protected deposits and secure payment processing',
        'Competitive Fees': 'Competitive Fees', 
        'Low service fees with deposit refunds for unsuccessful bids': 'Low service fees with deposit refunds for unsuccessful bids',
        'Expert Support': 'Expert Support',
        'Professional guidance throughout the bidding process': 'Professional guidance throughout the bidding process',
        'How It Works': 'How It Works',
        '1. Register': '1. Register',
        'Create your account in seconds': 'Create your account in seconds',
        '2. Find Vehicle': '2. Find Vehicle',
        'Provide the auction lot number': 'Provide the auction lot number',
        '3. Place Bid': '3. Place Bid',
        'Set your maximum bid amount': 'Set your maximum bid amount',
        '4. Win & Save': '4. Win & Save',
        'Get your vehicle at the best price': 'Get your vehicle at the best price',
        'Ready to Get Started?': 'Ready to Get Started?',
        'Join hundreds of satisfied customers who\'ve found their perfect vehicle through our brokerage service.': 'Join hundreds of satisfied customers who\'ve found their perfect vehicle through our brokerage service.',
        'Start Bidding Today': 'Start Bidding Today',
        'All rights reserved.': 'All rights reserved.',
        'Professional Car Brokerage Services': 'Professional Car Brokerage Services'
    },
    es: {
        // Navigation
        'West Automotive LLC': 'West Automotive LLC',
        'Place Bid': 'Hacer Oferta',
        'My Bids': 'Mis Ofertas',
        'Login': 'Iniciar Sesión',
        'Sign Up': 'Registrarse',
        'Logout': 'Cerrar Sesión',
        'Welcome': 'Bienvenido',
        
        // Main Page
        'Professional Car Brokerage Services': 'Servicios Profesionales de Corretaje de Autos',
        'Bid on auction vehicles with expert guidance and competitive pricing': 'Oferte en vehículos de subasta con orientación experta y precios competitivos',
        'Place Your Bid': 'Hacer Una Oferta',
        'Secure Bidding': 'Ofertas Seguras',
        'Protected deposits and secure payment processing': 'Depósitos protegidos y procesamiento de pagos seguro',
        'Competitive Fees': 'Tarifas Competitivas',
        'Low service fees with deposit refunds for unsuccessful bids': 'Bajas tarifas de servicio con reembolsos de depósito para ofertas no exitosas',
        'Expert Support': 'Soporte Experto',
        'Professional guidance throughout the bidding process': 'Orientación profesional durante todo el proceso de ofertas',
        'How It Works': 'Cómo Funciona',
        '1. Register': '1. Registrarse',
        'Create your account in seconds': 'Crea tu cuenta en segundos',
        '2. Find Vehicle': '2. Encontrar Vehículo',
        'Provide the auction lot number': 'Proporcione el número de lote de subasta',
        '3. Place Bid': '3. Hacer Oferta',
        'Set your maximum bid amount': 'Establezca su monto de oferta máxima',
        '4. Win & Save': '4. Ganar y Ahorrar',
        'Get your vehicle at the best price': 'Obtenga su vehículo al mejor precio',
        'Ready to Get Started?': '¿Listo para Comenzar?',
        'Join hundreds of satisfied customers who\'ve found their perfect vehicle through our brokerage service.': 'Únase a cientos de clientes satisfechos que han encontrado su vehículo perfecto a través de nuestro servicio de corretaje.',
        'Start Bidding Today': 'Comenzar a Ofertar Hoy',
        'All rights reserved.': 'Todos los derechos reservados.',
        'Professional Car Brokerage Services': 'Servicios Profesionales de Corretaje de Autos'
    },
    fr: {
        // Navigation
        'West Automotive LLC': 'West Automotive LLC',
        'Place Bid': 'Faire une Offre',
        'My Bids': 'Mes Offres',
        'Login': 'Connexion',
        'Sign Up': 'S\'Inscrire',
        'Logout': 'Déconnexion',
        'Welcome': 'Bienvenue',
        
        // Main Page
        'Professional Car Brokerage Services': 'Services Professionnels de Courtage Automobile',
        'Bid on auction vehicles with expert guidance and competitive pricing': 'Enchérissez sur des véhicules aux enchères avec des conseils d\'experts et des prix compétitifs',
        'Place Your Bid': 'Faire une Offre',
        'Secure Bidding': 'Enchères Sécurisées',
        'Protected deposits and secure payment processing': 'Dépôts protégés et traitement de paiement sécurisé',
        'Competitive Fees': 'Frais Compétitifs',
        'Low service fees with deposit refunds for unsuccessful bids': 'Faibles frais de service avec remboursements des dépôts pour les offres infructueuses',
        'Expert Support': 'Support Expert',
        'Professional guidance throughout the bidding process': 'Conseils professionnels tout au long du processus d\'enchères',
        'How It Works': 'Comment ça Marche',
        '1. Register': '1. S\'Inscrire',
        'Create your account in seconds': 'Créez votre compte en quelques secondes',
        '2. Find Vehicle': '2. Trouver un Véhicule',
        'Provide the auction lot number': 'Fournissez le numéro de lot des enchères',
        '3. Place Bid': '3. Faire une Offre',
        'Set your maximum bid amount': 'Définissez votre montant d\'offre maximum',
        '4. Win & Save': '4. Gagner et Économiser',
        'Get your vehicle at the best price': 'Obtenez votre véhicule au meilleur prix',
        'Ready to Get Started?': 'Prêt à Commencer?',
        'Join hundreds of satisfied customers who\'ve found their perfect vehicle through our brokerage service.': 'Rejoignez des centaines de clients satisfaits qui ont trouvé leur véhicule parfait grâce à notre service de courtage.',
        'Start Bidding Today': 'Commencer les Enchères Aujourd\'hui',
        'All rights reserved.': 'Tous droits réservés.',
        'Professional Car Brokerage Services': 'Services Professionnels de Courtage Automobile'
    }
};

function switchLanguage(lang) {
    if (!translations[lang]) return;
    
    // Translate all text nodes
    function translateNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            if (text && translations[lang][text]) {
                node.textContent = translations[lang][text];
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Translate placeholders
            if (node.placeholder && translations[lang][node.placeholder]) {
                node.placeholder = translations[lang][node.placeholder];
            }
            // Translate children
            node.childNodes.forEach(translateNode);
        }
    }
    
    document.querySelectorAll('body *').forEach(translateNode);
    localStorage.setItem('preferredLanguage', lang);
}

function initLanguage() {
    // Create and inject language selector
    if (!document.getElementById('globalLanguageSelector')) {
        const selector = document.createElement('div');
        selector.id = 'globalLanguageSelector';
        selector.innerHTML = `
            <select class="form-select form-select-sm" style="position: fixed; top: 15px; right: 150px; z-index: 10000; width: auto;">
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
            </select>
        `;
        document.body.appendChild(selector);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #globalLanguageSelector {
                position: fixed;
                top: 15px;
                right: 150px;
                z-index: 10000;
            }
            @media (max-width: 768px) {
                #globalLanguageSelector {
                    top: 70px;
                    right: 15px;
                }
            }
        `;
        document.head.appendChild(style);
        
        // Add event listener
        selector.querySelector('select').addEventListener('change', (e) => {
            switchLanguage(e.target.value);
        });
    }
    
    // Apply saved language
    const savedLang = localStorage.getItem('preferredLanguage') || 'en';
    document.getElementById('globalLanguageSelector').querySelector('select').value = savedLang;
    switchLanguage(savedLang);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initLanguage);
