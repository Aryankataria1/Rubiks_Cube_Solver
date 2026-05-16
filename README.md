# 🧊 3D Rubik's Cube Solver

An interactive, web-based 3D Rubik's Cube solver application. This project replaces cumbersome text-based cube inputs with an intuitive 3D interface that allows users to "paint" the stickers of a scrambled cube directly in the browser. The application then communicates with a Python backend to calculate the optimal solution using the Kociemba algorithm and presents the solution steps through an animated 3D playback UI.

## ✨ Features
- **Interactive 3D Interface**: Paint your scrambled cube's state directly onto a 3D model using the mouse.
- **Fast Solving Algorithm**: Uses the highly efficient Kociemba two-phase algorithm on the backend to find solutions in 20 moves or fewer.
- **Animated Solution Playback**: Watch the cube solve itself step-by-step with smooth 3D animations, making it easy to follow along and solve your real-life cube.
- **Modern UI/UX**: Clean, responsive, and visually appealing web design.

## 🛠️ Technologies Used
- **Frontend**: HTML5, CSS3, JavaScript, and [Three.js](https://threejs.org/) for rendering the 3D cube and animations.
- **Backend**: Python with the [Flask](https://flask.palletsprojects.com/) framework.
- **Solver**: The `rubik-solver` Python library (Kociemba algorithm).

## 🚀 How to Run Locally

Follow these steps to run the application on your own machine.

### Prerequisites
Make sure you have Python (version 3.x) installed on your system. 

### 1. Clone the repository
```bash
git clone https://github.com/Aryankataria1/Rubiks_Cube_Solver.git
cd Rubiks_Cube_Solver
```

### 2. Install dependencies
It's recommended to create a virtual environment first, but you can also install directly.
```bash
pip install -r requirements.txt
```

### 3. Run the application
Start the Flask development server:
```bash
python app.py
```
*(If you are on macOS or Linux, you might need to run `python3 app.py`)*

### 4. Open in browser
Open your web browser and go to:
```
http://127.0.0.1:5000/
```

## 🎮 How to Use
1. **Select a Color**: Click on one of the color palettes provided on the screen.
2. **Paint the Cube**: Click on the individual stickers of the 3D cube to paint them to match your scrambled physical cube. You can rotate the cube by clicking and dragging outside the cube.
3. **Solve**: Once your 3D cube perfectly matches your scrambled cube, click the **"Solve"** button.
4. **Follow the Steps**: Use the playback controls (Next, Prev, Play, Pause) to watch the sequence of moves required to solve the cube. Follow along with your real cube!

## 📄 License
This project is open-source and available for personal or educational use.
