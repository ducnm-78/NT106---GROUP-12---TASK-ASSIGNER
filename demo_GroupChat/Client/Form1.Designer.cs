namespace Client
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
            textBox1 = new TextBox();
            textBox2 = new TextBox();
            btnConnect = new Button();
            rtbChat = new RichTextBox();
            InputMsg = new TextBox();
            btnSend = new Button();
            SuspendLayout();
            // 
            // textBox1
            // 
            textBox1.Location = new Point(68, 33);
            textBox1.Name = "textBox1";
            textBox1.Size = new Size(156, 23);
            textBox1.TabIndex = 0;
            // 
            // textBox2
            // 
            textBox2.Location = new Point(311, 33);
            textBox2.Name = "textBox2";
            textBox2.Size = new Size(100, 23);
            textBox2.TabIndex = 1;
            // 
            // btnConnect
            // 
            btnConnect.Location = new Point(537, 33);
            btnConnect.Name = "btnConnect";
            btnConnect.Size = new Size(75, 23);
            btnConnect.TabIndex = 2;
            btnConnect.Text = "Connect";
            btnConnect.UseVisualStyleBackColor = true;
            btnConnect.Click += btnConnect_Click;
            // 
            // rtbChat
            // 
            rtbChat.Location = new Point(68, 94);
            rtbChat.Name = "rtbChat";
            rtbChat.ReadOnly = true;
            rtbChat.Size = new Size(544, 209);
            rtbChat.TabIndex = 3;
            rtbChat.Text = "";
            // 
            // InputMsg
            // 
            InputMsg.Location = new Point(68, 332);
            InputMsg.Name = "InputMsg";
            InputMsg.Size = new Size(497, 23);
            InputMsg.TabIndex = 4;
            // 
            // btnSend
            // 
            btnSend.Location = new Point(602, 332);
            btnSend.Name = "btnSend";
            btnSend.Size = new Size(75, 23);
            btnSend.TabIndex = 5;
            btnSend.Text = "Send";
            btnSend.UseVisualStyleBackColor = true;
            btnSend.Click += btnSend_Click_1;
            // 
            // Form1
            // 
            AutoScaleDimensions = new SizeF(7F, 15F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(831, 450);
            Controls.Add(btnSend);
            Controls.Add(InputMsg);
            Controls.Add(rtbChat);
            Controls.Add(btnConnect);
            Controls.Add(textBox2);
            Controls.Add(textBox1);
            Name = "Form1";
            Text = "Form1";
            ResumeLayout(false);
            PerformLayout();
        }

        #endregion

        private TextBox textBox1;
        private TextBox textBox2;
        private Button btnConnect;
        private RichTextBox rtbChat;
        private TextBox InputMsg;
        private Button btnSend;
    }
}
