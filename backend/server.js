const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Para servir imágenes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configurar almacenamiento de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Conexión a MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'SistemaEscolar'
});

db.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
    process.exit(1);
  }
  console.log('Conexión exitosa a la base de datos MySQL');
});

// ------------------- ENDPOINTS -------------------

// Libros
app.get('/libros', (req, res) => {
  const query = 'SELECT id, ISBN, titulo, autor, stock, imagen FROM Libro';
  db.query(query, (err, results) => {
    if (err) return res.status(500).send('Error al obtener los libros');
    const librosConImagenes = results.map(libro => ({
      ...libro,
      imagen: libro.imagen ? `http://localhost:5000/uploads/${libro.imagen}` : null
    }));
    res.json(librosConImagenes);
  });
});

app.post('/libros', upload.single('imagen'), (req, res) => {
  const { ISBN, titulo, autor, stock } = req.body;
  const imagen = req.file ? req.file.filename : null;

  const query = 'INSERT INTO Libro (ISBN, titulo, autor, stock, imagen) VALUES (?, ?, ?, ?, ?)';
  db.query(query, [ISBN, titulo, autor, stock, imagen], (err, results) => {
    if (err) return res.status(500).send('Error al crear libro');
    res.json({ message: 'Libro creado', id: results.insertId });
  });
});

app.put('/libros/:id', upload.single('imagen'), (req, res) => {
  const { id } = req.params;
  const { titulo, autor, stock } = req.body;
  const imagen = req.file ? req.file.filename : null;

  const query = imagen
    ? 'UPDATE Libro SET titulo = ?, autor = ?, stock = ?, imagen = ? WHERE id = ?'
    : 'UPDATE Libro SET titulo = ?, autor = ?, stock = ? WHERE id = ?';

  const params = imagen
    ? [titulo, autor, stock, imagen, id]
    : [titulo, autor, stock, id];

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error al actualizar el libro:', err);
      return res.status(500).send('Error al actualizar el libro');
    }
    if (results.affectedRows === 0) {
      return res.status(404).send('Libro no encontrado');
    }
    res.status(200).send('Libro actualizado');
  });
});

app.delete('/libros/:id', (req, res) => {
  const { id } = req.params;

  const deletePrestamosQuery = `DELETE FROM Prestamo WHERE ISBN = (SELECT ISBN FROM Libro WHERE id = ?)`;
  db.query(deletePrestamosQuery, [id], (err) => {
    if (err) return res.status(500).send('Error al eliminar préstamos');

    const deleteLibroQuery = 'DELETE FROM Libro WHERE id = ?';
    db.query(deleteLibroQuery, [id], (err, results) => {
      if (err) return res.status(500).send('Error al eliminar libro');
      if (results.affectedRows === 0) return res.status(404).send('Libro no encontrado');
      res.status(200).send('Libro eliminado');
    });
  });
});

// Registrar préstamo
app.post('/prestamos', (req, res) => {
  const { fechaPrestamo, fechaDevolucion, matricula, ISBN, cantidad } = req.body;

  if (!fechaPrestamo || !fechaDevolucion || !matricula || !ISBN || !cantidad) {
    return res.status(400).send('Faltan datos requeridos para el préstamo');
  }

  // Insertar el préstamo
  const insertQuery = `
    INSERT INTO Prestamo (fechaPrestamo, fechaDevolucion, matricula, ISBN, cantidad)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(insertQuery, [fechaPrestamo, fechaDevolucion, matricula, ISBN, cantidad], (err, result) => {
    if (err) {
      console.error('Error al registrar el préstamo:', err);
      return res.status(500).send('Error al registrar el préstamo');
    }

    // Actualizar el stock del libro
    const updateStockQuery = `
      UPDATE Libro SET stock = stock - ? WHERE ISBN = ?
    `;
    db.query(updateStockQuery, [cantidad, ISBN], (err2) => {
      if (err2) {
        console.error('Error al actualizar el stock:', err2);
        return res.status(500).send('Préstamo creado, pero error al actualizar stock');
      }

      res.status(200).json({ message: 'Préstamo registrado correctamente' });
    });
  });
});

// Obtener los préstamos por matrícula
app.get('/prestamos', (req, res) => {
  const { matricula } = req.query;

  if (!matricula) {
    return res.status(400).send('La matrícula es requerida');
  }

  const query = `
    SELECT 
      p.id, p.matricula, p.ISBN, p.fechaPrestamo, p.fechaDevolucion, p.returned,
      l.titulo, l.imagen
    FROM Prestamo p
    JOIN Libro l ON p.ISBN = l.ISBN
    WHERE p.matricula = ?
  `;

  db.query(query, [matricula], (err, results) => {
    if (err) {
      console.error('Error al obtener préstamos:', err);
      return res.status(500).send('Error al obtener préstamos');
    }

    const prestamosConImagen = results.map((p) => ({
      ...p,
      imagen: p.imagen ? `http://localhost:5000/uploads/${p.imagen}` : null
    }));

    res.json(prestamosConImagen);
  });
});

// Marcar préstamo como devuelto
app.put('/prestamos/:id', (req, res) => {
  const { id } = req.params;
  const { returned } = req.body;

  if (typeof returned !== 'boolean') {
    return res.status(400).send('El valor de returned debe ser booleano');
  }

  const query = `UPDATE Prestamo SET returned = ? WHERE id = ?`;
  db.query(query, [returned, id], (err, result) => {
    if (err) {
      console.error('Error al actualizar el préstamo:', err);
      return res.status(500).send('Error al actualizar el préstamo');
    }

    if (result.affectedRows === 0) {
      return res.status(404).send('Préstamo no encontrado');
    }

    res.status(200).send('Préstamo actualizado correctamente');
  });
});

// LIBROS
app.get('/libros/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM Libro WHERE id = ?', [id], (err, results) => {
      if (err) return res.status(500).send('Error al obtener el libro');
      if (results.length === 0) return res.status(404).send('Libro no encontrado');
      res.json(results[0]);
  });
});

app.put('/libros/:id', upload.single('imagen'), (req, res) => {
  const { id } = req.params;
  const { ISBN, titulo, autor, stock } = req.body;
  const imagen = req.file ? req.file.filename : null;

  const query = imagen
      ? 'UPDATE Libro SET ISBN = ?, titulo = ?, autor = ?, stock = ?, imagen = ? WHERE id = ?'
      : 'UPDATE Libro SET ISBN = ?, titulo = ?, autor = ?, stock = ? WHERE id = ?';

  const params = imagen
      ? [ISBN, titulo, autor, stock, imagen, id]
      : [ISBN, titulo, autor, stock, id];

  db.query(query, params, (err, results) => {
      if (err) return res.status(500).send('Error al actualizar libro');
      if (results.affectedRows === 0) return res.status(404).send('Libro no encontrado');
      res.status(200).send('Libro actualizado');
  });
});

app.delete('/libros/:id', (req, res) => {
  const { id } = req.params;

  const deletePrestamosQuery = `DELETE FROM Prestamo WHERE ISBN = (SELECT ISBN FROM Libro WHERE id = ?)`
  db.query(deletePrestamosQuery, [id], (err) => {
      if (err) return res.status(500).send('Error al eliminar los préstamos');

      const deleteLibroQuery = 'DELETE FROM Libro WHERE id = ?';
      db.query(deleteLibroQuery, [id], (err, results) => {
          if (err) return res.status(500).send('Error al eliminar libro');
          if (results.affectedRows === 0) return res.status(404).send('Libro no encontrado');
          res.status(200).send('Libro eliminado');
      });
  });
});

// ADMINISTRADORES
app.get('/administradores', (req, res) => {
  db.query('SELECT * FROM Administrador', (err, results) => {
      if (err) return res.status(500).send('Error en el servidor');
      res.json(results);
  });
});

app.post('/administradores', (req, res) => {
  const { nombre_completo, matricula, password } = req.body;
  const query = 'INSERT INTO Administrador (nombre_completo, matricula, password) VALUES (?, ?, ?)';
  db.query(query, [nombre_completo, matricula, password], (err, results) => {
      if (err) return res.status(500).send('Error en el servidor');
      res.json({ message: 'Administrador creado', id: results.insertId });
  });
});

app.post('/login-admin', (req, res) => {
  const { matricula, password } = req.body;
  const query = 'SELECT * FROM Administrador WHERE matricula = ? AND password = ?';
  db.query(query, [matricula, password], (err, results) => {
      if (err) return res.status(500).send('Error en el servidor');
      if (results.length === 0) return res.status(401).send('Credenciales inválidas');
      res.status(200).json({ message: 'Autenticación exitosa' });
  });
});

app.post('/login-alumno', (req, res) => {
  const { matricula, password } = req.body;
  const query = 'SELECT * FROM Alumno WHERE matricula = ? AND password = ?';
  db.query(query, [matricula, password], (err, results) => {
      if (err) return res.status(500).send('Error en el servidor');
      if (results.length === 0) return res.status(401).send('Credenciales inválidas');
      res.status(200).json({
          message: 'Autenticación exitosa',
          matricula: results[0].matricula
      });
  });
});

app.get('/prestamos', (req, res) => {
  const { matricula } = req.query;

  if (!matricula) {
      return res.status(400).json({ error: 'La matrícula es requerida' });
  }

  const query = `
      SELECT p.id, p.matricula, p.ISBN,
      DATE_FORMAT(p.fechaPrestamo, '%Y-%m-%d') AS fechaPrestamo,
      DATE_FORMAT(p.fechaDevolucion, '%Y-%m-%d') AS fechaDevolucion,
      l.titulo, l.imagen, p.returned
      FROM Prestamo p
      JOIN Libro l ON p.ISBN = l.ISBN
      WHERE p.matricula = ?
  `;

  db.query(query, [matricula], (err, results) => {
      if (err) {
          console.error('Error al obtener los préstamos:', err);
          return res.status(500).json({ error: 'Error al obtener los préstamos' });
      }

      const prestamosConImagenes = results.map(prestamo => ({
          ...prestamo,
          imagen: prestamo.imagen ? `http://localhost:5000/uploads/${prestamo.imagen}` : null
      }));

      res.json(prestamosConImagenes);
  });
});

app.post('/prestamos', (req, res) => {
  const { fechaPrestamo, fechaDevolucion, matricula, ISBN, cantidad } = req.body;

  if (!fechaPrestamo || !fechaDevolucion || !matricula || !ISBN || !cantidad) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  const query = `
      INSERT INTO Prestamo (fechaPrestamo, fechaDevolucion, matricula, ISBN, cantidad)
      VALUES (?, ?, ?, ?, ?)
  `;

  db.query(query, [fechaPrestamo, fechaDevolucion, matricula, ISBN, cantidad], (err, results) => {
      if (err) {
          console.error('Error al registrar el préstamo:', err);
          return res.status(500).json({ error: 'Error al registrar el préstamo' });
      }

      res.status(201).json({ message: 'Préstamo registrado exitosamente', id: results.insertId });
  });
});

app.put('/prestamos/:id', (req, res) => {
  const { id } = req.params;
  const { returned } = req.body;
  db.query('UPDATE Prestamo SET returned = ? WHERE id = ?', [returned, id], (err, results) => {
      if (err) return res.status(500).send('Error al actualizar préstamo');
      if (results.affectedRows === 0) return res.status(404).send('Préstamo no encontrado');
      res.status(200).send('Préstamo actualizado');
  });
});


app.listen(PORT, () => {
  console.log(`API corriendo en el puerto ${PORT}`);
});
