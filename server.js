const express = require('express');
const jsonServer = require('json-server');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const router = jsonServer.router('db.json'); // Файл з базою даних JSON

app.use(express.json());

// Заголовки для дозволу на запити з іншого домену (використовуйте реальну доменну адресу, яка буде використовуватися у веб-клієнті)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://your-frontend-domain.com');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Реєстрація користувача
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  // Перевірка, чи користувач вже існує
  const userExists = db.get('users').find({ email }).value();
  if (userExists) {
    return res.status(409).json({ message: 'Користувач з таким email вже існує' });
  }

  try {
    // Хешування пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Додавання нового користувача
    db.get('users')
      .push({ username, email, password: hashedPassword, cart: [], favorites: [] })
      .write();

    res.status(201).json({ message: 'Користувач успішно зареєстрований' });
  } catch (error) {
    res.status(500).json({ message: 'Сталася помилка під час реєстрації користувача' });
  }
});

// Авторизація користувача
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Перевірка, чи користувач існує
  const user = db.get('users').find({ email }).value();
  if (!user) {
    return res.status(401).json({ message: 'Неправильний email або пароль' });
  }

  try {
    // Перевірка пароля
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Неправильний email або пароль' });
    }

    // Генерація JWT-токена
    const token = jwt.sign({ userId: user.id }, 'secretKey', { expiresIn: '1h' });

    res.status(200).json({ message: 'Авторизація успішна', token });
  } catch (error) {
    res.status(500).json({ message: 'Сталася помилка під час авторизації користувача' });
  }
});

// Додавання продукту до корзини
app.post('/cart', authenticateToken, (req, res) => {
  const { productId } = req.body;
  const userId = req.user.userId;

  const user = db.get('users').find({ id: userId }).value();
  if (!user) {
    return res.status(401).json({ message: 'Користувач не знайдений' });
  }

  // Додавання продукту до корзини користувача
  db.get('users').find({ id: userId }).get('cart').push(productId).write();

  res.status(200).json({ message: 'Продукт додано до корзини' });
});

// Додавання продукту до улюблених
app.post('/favorites', authenticateToken, (req, res) => {
  const { productId } = req.body;
  const userId = req.user.userId;

  const user = db.get('users').find({ id: userId }).value();
  if (!user) {
    return res.status(401).json({ message: 'Користувач не знайдений' });
  }

  // Додавання продукту до списку улюблених користувача
  db.get('users').find({ id: userId }).get('favorites').push(productId).write();

  res.status(200).json({ message: 'Продукт додано до улюблених' });
});

// Отримання списку доступних товарів
app.get('/products', (req, res) => {
  const products = db.get('products').value();
  res.status(200).json(products);
});

// Функція для перевірки JWT-токена авторизації
function authenticateToken(req, res, next) {
  const authHeader = req.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token === null) {
    return res.status(401).json({ message: 'JWT-токен не знайдено' });
  }

  jwt.verify(token, 'secretKey', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'JWT-токен недійсний' });
    }

    req.user = user;
    next();
  });
}

// Запуск сервера
app.use('/api', router); // jsonServer роутер
const port = 3000;
app.listen(port, () => {
  console.log(`Сервер запущено на порту ${port}`);
});
