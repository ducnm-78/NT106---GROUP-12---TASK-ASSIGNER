namespace demo_FTP
{
    partial class Form1
    {
        /// <summary>
        ///  Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        ///  Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        ///  Required method for Designer support - do not modify
        ///  the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            pictureBox1 = new PictureBox();
            ChangeAvt = new Button();
            textBox1 = new TextBox();
            tep = new ListBox();
            Attach = new Button();
            btnSave = new Button();
            ((System.ComponentModel.ISupportInitialize)pictureBox1).BeginInit();
            SuspendLayout();
            // 
            // pictureBox1
            // 
            pictureBox1.Location = new Point(120, 70);
            pictureBox1.Name = "pictureBox1";
            pictureBox1.Size = new Size(110, 85);
            pictureBox1.SizeMode = PictureBoxSizeMode.Zoom;
            pictureBox1.TabIndex = 0;
            pictureBox1.TabStop = false;
            // 
            // ChangeAvt
            // 
            ChangeAvt.Location = new Point(137, 161);
            ChangeAvt.Name = "ChangeAvt";
            ChangeAvt.Size = new Size(75, 24);
            ChangeAvt.TabIndex = 1;
            ChangeAvt.Text = "doi avt";
            ChangeAvt.UseVisualStyleBackColor = true;
            ChangeAvt.Click += ChangeAvt_Click;
            // 
            // textBox1
            // 
            textBox1.Location = new Point(351, 82);
            textBox1.Name = "textBox1";
            textBox1.Size = new Size(300, 23);
            textBox1.TabIndex = 2;
            // 
            // tep
            // 
            tep.FormattingEnabled = true;
            tep.Location = new Point(351, 121);
            tep.Name = "tep";
            tep.Size = new Size(243, 109);
            tep.TabIndex = 3;
            // 
            // Attach
            // 
            Attach.Location = new Point(600, 121);
            Attach.Name = "Attach";
            Attach.Size = new Size(75, 23);
            Attach.TabIndex = 4;
            Attach.Text = "dinh kem";
            Attach.UseVisualStyleBackColor = true;
            Attach.Click += Attach_Click;
            // 
            // btnSave
            // 
            btnSave.Location = new Point(433, 266);
            btnSave.Name = "btnSave";
            btnSave.Size = new Size(75, 23);
            btnSave.TabIndex = 5;
            btnSave.Text = "Luu";
            btnSave.UseVisualStyleBackColor = true;
            btnSave.Click += btnSave_Click;
            // 
            // Form1
            // 
            AutoScaleDimensions = new SizeF(7F, 15F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(844, 399);
            Controls.Add(btnSave);
            Controls.Add(Attach);
            Controls.Add(tep);
            Controls.Add(textBox1);
            Controls.Add(ChangeAvt);
            Controls.Add(pictureBox1);
            Name = "Form1";
            Text = "Form1";
            ((System.ComponentModel.ISupportInitialize)pictureBox1).EndInit();
            ResumeLayout(false);
            PerformLayout();
        }

        #endregion

        private PictureBox pictureBox1;
        private Button ChangeAvt;
        private TextBox textBox1;
        private ListBox tep;
        private Button Attach;
        private Button btnSave;
    }
}
