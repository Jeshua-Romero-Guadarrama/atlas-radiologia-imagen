/*
 * Modo estudio.
 * Muestra una imagen del catálogo y pide identificar de qué estudio o hallazgo se trata, que es la forma de repaso más parecida a lo que se pregunta en un examen.
 * Los distractores se eligen primero entre las fichas del mismo sistema, con el fin de que la respuesta no salga por descarte.
 */

import { escapar } from "../nucleo/Texto.js";
import { mezclar, ico } from "../nucleo/util.js";
import { IMAGEN_RESERVA } from "../nucleo/ImagenReserva.js";

const TOTAL_PREGUNTAS = 8;

export class Quiz {
  constructor(repositorio) {
    this.repositorio = repositorio;
    this.preguntas = [];
    this.indice = 0;
    this.puntos = 0;
    // Los tres botones fijos se conectan una sola vez, en el arranque, puesto que viven en el marcado y no se vuelven a crear.
    const empezar = document.getElementById("boton-empezar");
    const siguiente = document.getElementById("boton-siguiente");
    const reiniciar = document.getElementById("boton-reiniciar");
    if (empezar) empezar.addEventListener("click", () => this.empezar());
    if (siguiente) siguiente.addEventListener("click", () => this.siguiente());
    if (reiniciar) reiniciar.addEventListener("click", () => this.empezar());
  }

  empezar() {
    const conImagen = this.repositorio.fichas.filter((f) => f.imagen);
    // Con menos de dos fichas con imagen no hay pregunta con distractor posible, de modo que se explica el motivo en la pantalla de inicio en lugar de arrancar un quiz vacío.
    if (conImagen.length < 2) {
      const presentacion = document.querySelector("#quiz-inicio p");
      if (presentacion) presentacion.textContent = "El modo estudio necesita fichas con imagen en el catálogo, y ahora mismo no hay suficientes para plantear una pregunta.";
      return;
    }
    this.preguntas = mezclar(conImagen).slice(0, Math.min(TOTAL_PREGUNTAS, conImagen.length));
    this.indice = 0;
    this.puntos = 0;
    document.getElementById("quiz-inicio").classList.add("oculta");
    document.getElementById("quiz-final").classList.add("oculta");
    document.getElementById("quiz-pregunta").classList.remove("oculta");
    this.mostrarPregunta();
  }

  mostrarPregunta() {
    const correcta = this.preguntas[this.indice];
    document.getElementById("quiz-numero").textContent =
      `Pregunta ${this.indice + 1} de ${this.preguntas.length}`;
    document.getElementById("quiz-puntos").textContent = this.puntos;
    const barra = document.getElementById("quiz-barra-relleno");
    if (barra) barra.style.width = `${(this.indice / this.preguntas.length) * 100}%`;

    const imagen = document.getElementById("quiz-imagen");
    imagen.src = correcta.imagen;
    imagen.onerror = () => { imagen.src = IMAGEN_RESERVA; };

    // Distractores preferentemente del mismo sistema, para que cueste más
    const fichas = this.repositorio.fichas;
    const mismoSistema = fichas.filter((f) => f.codigo !== correcta.codigo && f.sistema === correcta.sistema);
    const otros = fichas.filter((f) => f.codigo !== correcta.codigo && f.sistema !== correcta.sistema);
    const distractores = [...mezclar(mismoSistema), ...mezclar(otros)].slice(0, 3);
    const opciones = mezclar([correcta, ...distractores]);

    const contenedor = document.getElementById("quiz-opciones");
    contenedor.innerHTML = "";
    opciones.forEach((opcion) => {
      const boton = document.createElement("button");
      boton.className = "quiz-opcion";
      boton.textContent = opcion.titulo;
      boton.addEventListener("click", () => this.responder(boton, opcion, correcta));
      contenedor.appendChild(boton);
    });

    document.getElementById("quiz-retro").classList.add("oculta");
    document.getElementById("boton-siguiente").classList.add("oculta");
  }

  responder(botonElegido, opcion, correcta) {
    document.querySelectorAll(".quiz-opcion").forEach((b) => {
      b.disabled = true;
      if (b.textContent === correcta.titulo) b.classList.add("correcta");
    });
    const retro = document.getElementById("quiz-retro");
    if (opcion.codigo === correcta.codigo) {
      this.puntos++;
      retro.className = "quiz-retro bien";
      retro.innerHTML = `${ico("check")} <span><strong>¡Correcto!</strong> ${escapar(correcta.hallazgos || "")}</span>`;
    } else {
      botonElegido.classList.add("incorrecta");
      retro.className = "quiz-retro mal";
      retro.innerHTML = `${ico("equis")} <span><strong>Era:</strong> ${escapar(correcta.titulo)}. ${escapar(correcta.hallazgos || "")}</span>`;
    }
    retro.classList.remove("oculta");
    document.getElementById("quiz-puntos").textContent = this.puntos;
    const siguiente = document.getElementById("boton-siguiente");
    siguiente.classList.remove("oculta");
    // Las opciones quedan deshabilitadas al responder y el foco se quedaría en un botón muerto, de modo que se lleva al siguiente paso del recorrido.
    siguiente.focus();
  }

  siguiente() {
    this.indice++;
    if (this.indice < this.preguntas.length) {
      this.mostrarPregunta();
    } else {
      const barra = document.getElementById("quiz-barra-relleno");
      if (barra) barra.style.width = "100%";
      document.getElementById("quiz-pregunta").classList.add("oculta");
      document.getElementById("quiz-final").classList.remove("oculta");
      const mensaje =
        this.puntos === this.preguntas.length ? "¡Perfecto! Dominas el tema." :
        this.puntos >= this.preguntas.length * 0.6 ? "¡Muy bien! Vas por buen camino." :
        "Sigue practicando, ¡tú puedes!";
      document.getElementById("quiz-resultado-final").textContent =
        `Acertaste ${this.puntos} de ${this.preguntas.length}. ${mensaje}`;
    }
  }
}
