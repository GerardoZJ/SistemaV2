import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import './Desings/AgregarLibroDesing.css';

export const EditarLibro = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState('');
  const [autor, setAutor] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [imagen, setImagen] = useState(null); // Estado para la imagen
  const [imagenActual, setImagenActual] = useState(''); // URL de la imagen actual

  // Función para obtener los datos del libro desde el backend
  const fetchLibro = async () => {
    try {
      const response = await fetch(`http://localhost:5000/libros/${id}`);
      if (response.ok) {
        const data = await response.json();
        setTitulo(data.titulo);
        setAutor(data.autor);
        setCantidad(data.stock);
        setImagenActual(data.imagen); // Guarda la URL de la imagen actual
      } else {
        alert('Error al obtener los datos del libro');
      }
    } catch (error) {
      console.error('Error al obtener los datos del libro:', error);
    }
  };

  useEffect(() => {
    fetchLibro();
  }, [id]);

  // Función para manejar la edición del libro
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo || !autor || cantidad < 1) {
      alert('Por favor, completa todos los campos correctamente.');
      return;
    }

    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('autor', autor);
    formData.append('stock', cantidad);
    if (imagen) {
      formData.append('imagen', imagen); // Agrega la nueva imagen si se seleccionó
    }

    try {
      const response = await fetch(`http://localhost:5000/libros/${id}`, {
        method: 'PUT',
        body: formData,
      });

      if (response.ok) {
        alert('Libro editado exitosamente');
        navigate('/AdminIndex');
      } else {
        alert('Error al editar el libro');
      }
    } catch (error) {
      console.error('Error al editar el libro:', error);
      alert('Error al conectar con el servidor');
    }
  };

  return (
    <motion.div
      className="agregar-libro-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2>Editar Libro</h2>
      <form className="agregar-libro-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>ID:</label>
          <input type="text" value={id} disabled />
        </div>
        <div className="form-group">
          <label>Título:</label>
          <input
            type="text"
            placeholder="Cambiar el título del libro"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Autor:</label>
          <input
            type="text"
            placeholder="Cambiar el autor del libro"
            value={autor}
            onChange={(e) => setAutor(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Cantidad:</label>
          <input
            type="number"
            min="1"
            placeholder="Cambiar la cantidad disponible"
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
            required
          />
        </div>
        <div className="form-group">
          <label>Imagen Actual:</label>
          {imagenActual ? (
            <img
              src={`http://localhost:5000/uploads/${imagenActual}`}
              alt="Imagen actual"
              className="book-image"
            />
          ) : (
            <p>No hay imagen</p>
          )}
        </div>
        <div className="form-group">
          <label>Nueva Imagen:</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImagen(e.target.files[0])}
          />
        </div>
        <motion.button
          type="submit"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          Editar Libro
        </motion.button>
      </form>
    </motion.div>
  );
};