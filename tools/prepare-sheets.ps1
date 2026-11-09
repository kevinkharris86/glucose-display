# Normalize generated equal-grid frames for stable feet and consistent scale.
# This slices/aligns the original drawings; it does not synthesize any poses.
param([Parameter(Mandatory=$true)][string]$Source, [Parameter(Mandatory=$true)][string]$Destination)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class SpriteTiles {
  public static void Prepare(string source,string destination) {
    using(var image=new Bitmap(source)) {
      var bounds=new Rectangle[16]; int maxW=0,maxH=0;
      var data=image.LockBits(new Rectangle(0,0,image.Width,image.Height),ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);
      var pixels=new byte[Math.Abs(data.Stride)*image.Height]; Marshal.Copy(data.Scan0,pixels,0,pixels.Length);
      for(int n=0;n<16;n++) {
        int l=(n%4)*image.Width/4, r=(n%4+1)*image.Width/4;
        int t=(n/4)*image.Height/4,b=(n/4+1)*image.Height/4;
        int x0=r,y0=b,x1=l,y1=t;
        for(int y=t;y<b;y++) for(int x=l;x<r;x++) if(pixels[y*data.Stride+x*4+3]>20) {
          x0=Math.Min(x0,x); x1=Math.Max(x1,x); y0=Math.Min(y0,y); y1=Math.Max(y1,y);
        }
        if(x1<x0 || y1<y0) throw new Exception("Empty sprite frame: "+n);
        bounds[n]=Rectangle.FromLTRB(Math.Max(l,x0-2),Math.Max(t,y0-2),Math.Min(r,x1+3),Math.Min(b,y1+3));
        maxW=Math.Max(maxW,bounds[n].Width); maxH=Math.Max(maxH,bounds[n].Height);
      }
      image.UnlockBits(data);
      const int tile=384;
      float scale=Math.Min(tile*.84f/maxW,tile*.84f/maxH);
      using(var output=new Bitmap(tile*4,tile*4,PixelFormat.Format32bppArgb)) using(var g=Graphics.FromImage(output)) {
        g.CompositingMode=System.Drawing.Drawing2D.CompositingMode.SourceCopy;
        g.InterpolationMode=System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
        for(int n=0;n<16;n++) {
          var b=bounds[n]; float w=b.Width*scale,h=b.Height*scale;
          // All frames share a fixed .9-tile floor and the same scale.
          g.DrawImage(image,new RectangleF((n%4)*tile+(tile-w)/2,(n/4)*tile+tile*.9f-h,w,h),b,GraphicsUnit.Pixel);
        }
        output.Save(destination,ImageFormat.Png);
      }
      Console.WriteLine("Prepared 16 aligned frames: "+destination);
    }
  }
}
'@ -ReferencedAssemblies System.Drawing.Common,System.Drawing.Primitives,System.Runtime.InteropServices,System.Private.Windows.Core,System.Private.Windows.GdiPlus,System.Console
[SpriteTiles]::Prepare($Source,$Destination)
