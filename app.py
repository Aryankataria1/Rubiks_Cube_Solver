from flask import Flask, render_template, request, jsonify
import kociemba

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/solve', methods=['POST'])
def solve():
    data = request.get_json()
    cube_string = data.get('cube', '')

    if len(cube_string) != 54:
        return jsonify({'error': 'Invalid cube: need exactly 54 characters'}), 400

    try:
        solution = kociemba.solve(cube_string)
        steps = solution.strip().split(' ')
        return jsonify({'solution': steps})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)