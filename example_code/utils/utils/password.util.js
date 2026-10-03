import bcrypt from 'bcryptjs';

/**
 * Hashes a plaintext password using bcrypt
 * @param {string} password - Plaintext password
 * @returns {Promise<string>} Hashed password
 */
export const hashPassword = async (password) => {
    try {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, salt);
    } catch (error) {
        console.error("Error in hashPassword:", error);
        throw error;
    }
};

/**
 * Verifies a plaintext password against a stored hash
 * @param {string} password - Plaintext password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if matching, false otherwise
 */
export const verifyPassword = async (password, hash) => {
    try {
        if (!password || !hash) return false;
        return await bcrypt.compare(password, hash);
    } catch (error) {
        console.error("Error in verifyPassword:", error);
        throw error;
    }
};

/**
 * Generate a random secure temporary password
 * @param {number} [length=10]
 * @returns {string}
 */
export const generateRandomPassword = (length = 10) => {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnpqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '@#$!%*';
    const allChars = uppercase + lowercase + numbers + symbols;

    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 4; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    return password.split('').sort(() => 0.5 - Math.random()).join('');
};