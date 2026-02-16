import sys
import os
from tkinter import Tk, Label, PhotoImage

if getattr(sys, 'frozen', False):
    base_path = sys._MEIPASS
else:
    base_path = os.path.dirname(__file__)

gif1_path = os.path.join(base_path, 'v1.gif')

root = Tk()
img = PhotoImage(file=gif1_path)
label = Label(root, image=img)
label.pack()

root.mainloop()
