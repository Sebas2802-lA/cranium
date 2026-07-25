# Cranium · Tarjetas renovadas

Página web privada para jugar con tarjetas revisadas y nuevas, organizadas en cuatro familias:

- 🔴 **DatoNauta** — investiga y resuelve.
- 🔵 **Gato Creativo** — dibuja y moldea.
- 🟡 **Lombriletras** — juegos de palabras.
- 🟢 **Star Estelar** — actúa y tararea.

## Qué incluye esta primera versión

- Cuatro botones principales con animaciones.
- Selección aleatoria de tarjetas por color.
- Una tarjeta de ejemplo para cada modalidad.
- Botón para mostrar u ocultar la respuesta.
- Botón para regresar a las categorías.
- Registro local de tarjetas jugadas para evitar repeticiones.
- Reinicio de todos los mazos.
- Reporte de tarjetas mediante texto copiable.
- Diseño principal para computadora, con adaptación básica para celular.
- Sin temporizador.

## Estructura

```text
cranium/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── app.js
├── data/
│   ├── modalidades.json
│   ├── tarjetas-rojas.json
│   ├── tarjetas-azules.json
│   ├── tarjetas-verdes.json
│   └── tarjetas-amarillas.json
└── assets/
```

## Cómo subirlo a tu repositorio

1. Descarga y descomprime el archivo ZIP.
2. Entra a tu repositorio privado de GitHub.
3. Pulsa **Add file → Upload files**.
4. Arrastra todos los archivos y carpetas que están dentro de la carpeta descomprimida.
5. Escribe un mensaje como `Primera versión funcional`.
6. Pulsa **Commit changes**.

> Importante: sube `index.html` en la raíz del repositorio, no dentro de una carpeta adicional.

## Cómo activar GitHub Pages

1. En el repositorio, entra a **Settings**.
2. Abre **Pages**.
3. En **Build and deployment**, elige **Deploy from a branch**.
4. Selecciona la rama `main` y la carpeta `/ (root)`.
5. Guarda los cambios.

GitHub mostrará la dirección de la página cuando termine la publicación.

### Importante sobre un repositorio privado

GitHub Pages desde repositorios privados requiere un plan compatible, como GitHub Pro, Team o Enterprise. Además, el sitio publicado normalmente puede ser visible públicamente aunque el repositorio siga siendo privado. Si deseas mantener también las tarjetas fuera de internet, utiliza la opción de servidor local descrita más abajo.

## Cómo probarlo en la computadora antes de publicarlo

Los navegadores normalmente no permiten que `index.html` cargue archivos JSON al abrirlo con doble clic. Puedes probarlo de una de estas formas:

### Visual Studio Code

1. Abre la carpeta del proyecto en Visual Studio Code.
2. Instala la extensión **Live Server**.
3. Haz clic derecho sobre `index.html`.
4. Selecciona **Open with Live Server**.

### Python

Abre una terminal dentro de la carpeta y ejecuta:

```bash
python -m http.server 8000
```

Después abre `http://localhost:8000`.

## Cómo añadir tarjetas

Cada color tiene su propio archivo JSON dentro de `data/`.

Ejemplo de una tarjeta amarilla:

```json
{
  "id": "LOM-ORD-002",
  "familia": "Lombriletras",
  "color": "amarillo",
  "modalidad": "ordenigma",
  "variante": "normal",
  "dificultad": "media",
  "pista": "Descripción breve",
  "anagrama": "LETRAS DESORDENADAS",
  "respuesta": "RESPUESTA CORRECTA"
}
```

Reglas importantes:

- Cada `id` debe ser único.
- No borres las comas entre tarjetas.
- Los textos deben ir entre comillas dobles.
- La última tarjeta de una lista no lleva coma después de la llave de cierre.
- Usa `todos_juegan` para la variante colectiva.
- Usa `normal` para la variante de un solo equipo.

## Identificadores sugeridos

- `DAT-OPO-001`: DatoNauta, Opcionómetro.
- `DAT-SNO-001`: DatoNauta, Sí o no.
- `DAT-PAR-001`: DatoNauta, Par de dos.
- `DAT-SAP-001`: DatoNauta, Sapienreto.
- `GAT-ESC-001`: Gato Creativo, Escultorama.
- `GAT-DIB-001`: Gato Creativo, Dibunoveo.
- `GAT-PIN-001`: Gato Creativo, PintaCierta.
- `STA-TIT-001`: Star Estelar, Titerín.
- `STA-IMI-001`: Star Estelar, Imitón.
- `STA-ADI-001`: Star Estelar, Adimimo.
- `STA-TAR-001`: Star Estelar, Tarasilba.
- `LOM-BUS-001`: Lombriletras, Buscapalabras.
- `LOM-LEX-001`: Lombriletras, Lexicón.
- `LOM-ORD-001`: Lombriletras, Ordenigma.
- `LOM-PIE-001`: Lombriletras, Piensaigual.
- `LOM-PAT-001`: Lombriletras, Todos Patrás.

Para las tarjetas “Todos juegan” puedes añadir `-TJ` antes del número:

```text
STA-ADI-TJ-002
```

## Interfaz v2

- Pantalla principal formada por cuatro cuadrantes grandes.
- Solo se muestra el nombre de cada familia.
- Logotipo de Cranium centrado.
- Transiciones más rápidas.
- Tarjeta física grande y centrada.
- Giro entre el frente de la prueba y el reverso de la respuesta.
- Botón para regresar de la respuesta a la prueba.
