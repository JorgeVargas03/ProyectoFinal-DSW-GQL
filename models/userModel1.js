require('dotenv').config();
const users = [];
const authCodes = [];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+521\d{10}$/;

const sendWhatsAppCode = (phone, code) => {
    const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
    return client.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        contentSid: 'HX229f5a04fd0510ce1b071852155d3e75',
        contentVariables: `{"1":"${code}"}`,
        to: `whatsapp:${phone}`
    })
}

const getAllUsers = () => users;
const getUserById = (id) => users.find(user => user.id === id);

const registerUser = async (email, phone, via) => {
    if (!emailRegex.test(email)) {
        throw new Error("Formato de correo inválido");
    }
    if (!phoneRegex.test(phone)) {
        throw new Error("Formato del número de telefónico inválido");
    }

    let user = users.find(u => u.email === email);
    const now = Date.now();

    const existingCode = authCodes.find(c => c.userId === (user?.id || ''));
    if (existingCode && now - new Date(existingCode.createdAt).getTime() < 60 * 1000) {
        throw new Error("Espera antes de solicitar otro código");
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const userId = (users.length + 1).toString();

    if (!user) {
        user = { id: userId, email, phone, isVerified: false };
        users.push(user);
    } else {
        user.phone = phone; //Actualizar número
    }

    authCodes.push({
        userId,
        code,
        createdAt: new Date().toISOString()
    });

    if (via === 'WhatsApp') {
        await sendWhatsAppCode(user.phone, code);
    }
    return user;
}

const verifyCode = (email, code) => {
    const user = users.find(user => user.email === email);
    if (!user) throw new Error("Usuario no encontrado");

    if (user.isVerified) throw new Error("El usuario ya se encuentra verificado")

    const auth = authCodes.find(c => c.userId === user.id);
    if (!auth) throw new Error("No se encontró un código de verificación");

    const expired = Date.now() - new Date(auth.createdAt).getTime() > 5 * 60 * 1000;
    if (expired) throw new Error("El código ha expirado");
    if (auth.code !== code) throw new Error("Código inválido");

    user.isVerified = true;
    const index = authCodes.findIndex(code => code.userId === user.id);
    if (index !== -1) authCodes.splice(index, 1);

    return {
        token: `${user.email}-${new Date().toISOString()}`,
        user
    };
}

const login = async (email) => {
    const user = users.find(user => user.email === email);
    if (!user) throw new Error("Usuario no encontrado");

    if (!user.isVerified) {
        const now = Date.now();
        const existingCode = authCodes.find(code => code.userId === user.id);

        if (existingCode && now - new Date(existingCode.createdAt).getTime() < 60 * 1000) {
            throw new Error("Espera antes de solicitar otro código");
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        authCodes.push({ userId: user.id, code, createdAt: new Date().toISOString() });

        await sendWhatsAppCode(user.phone, code);

        throw new Error("Se requiere verificación. El código ha sido reenviado");
    }

    return {
        token: `${user.email}-${new Date().toISOString()}`,
        user
    };
}

module.exports = { getAllUsers, getUserById, registerUser, verifyCode, login };