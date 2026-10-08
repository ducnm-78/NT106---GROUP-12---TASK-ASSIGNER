using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Text;
using System.Windows.Forms;

namespace Bai6
{
    public partial class UserControl1 : UserControl
    {
        public UserControl1()
        {
            InitializeComponent();
        }

        int i=0;
        private void button1_Click(object sender, EventArgs e)
        {
            i++;
            label1.Text = i.ToString();
        }
    }
}
