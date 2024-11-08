from flask import Flask, request, render_template, send_file
from wand.image import Image

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/process', methods=['POST'])
def process_image():
    image = request.files['image']
    width = int(request.form['width'])
    height = int(request.form['height'])
    
    with Image(file=image) as img:
        img.resize(width, height)
        img.save(filename='output.jpg')
    
    return send_file('output.jpg', mimetype='image/jpeg')

if __name__ == '__main__':
    app.run(debug=True)
    
    
    # Frontend in HTML 
#     <!DOCTYPE html>
# <html>
# <head>
#     <title>ImageMagick Resizer</title>
# </head>
# <body>
#     <h1>Resize Image</h1>
#     <form action="/process" method="post" enctype="multipart/form-data">
#         <input type="file" name="image" required>
#         <input type="text" name="width" placeholder="Width" required>
#         <input type="text" name="height" placeholder="Height" required>
#         <button type="submit">Resize</button>
#     </form>
# </body>
# </html>

# BASIC MVP1 FOR MIGRATION 