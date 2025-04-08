import React, { useEffect, useState } from "react";
import axios from "axios";
import '../Paginas/Desings/HomeDesing.css';

export const Home = () => {
  const [libros, setLibros] = useState([]);

  useEffect(() => {
    // Llamada a la API para obtener los libros
    axios.get("http://localhost:5000/libros")
      .then(res => {
        // Configuramos el estado con los datos de los libros
        setLibros(res.data);
      })
      .catch(err => console.error("Error al obtener libros:", err));
  }, []);

  return (
    <div className="productos-mas-vistos">
      <h2>Libros Disponibles</h2>
      <div className="productos-grid">
        {libros.map((libro) => (
          <div className="tarjeta-libro" key={libro.id}>
            <img 
              src={libro.imagen || '/path/to/default-image.jpg'} 
              alt={libro.titulo} 
              className="imagen-libro" 
            />
            <div className="detalles-libro">
              <h3>{libro.titulo}</h3>
              <p><strong>Autor:</strong> {libro.autor}</p>
              <p><strong>Stock:</strong> {libro.stock}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
