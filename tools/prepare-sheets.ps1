# Normalize generated equal-grid frames for stable feet and consistent scale.
# This slices/aligns the original drawings; it does not synthesize any poses.
param(
  [Parameter(Mandatory=$true)][string]$Source,
  [Parameter(Mandatory=$true)][string]$Destination,
  [switch]$GridAnchor,
  [switch]$RightFacingWalk,
  [switch]$CleanTiles
)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class SpriteTiles {
  // A neighboring drawing can spill over the generated grid line. Pack the
  // largest connected silhouette in each cell and retain its antialiased rim.
  private static void CleanTile(byte[] pixels,int stride,int left,int top,int width,int height) {
    var labels=new int[width*height];
    var queue=new int[labels.Length];
    int component=0,best=0,bestSize=0;
    for(int pos=0;pos<labels.Length;pos++) {
      int x=pos%width,y=pos/width;
      if(labels[pos]!=0 || pixels[(top+y)*stride+(left+x)*4+3]<=20) continue;
      int read=0,end=1;
      labels[pos]=++component;
      queue[0]=pos;
      while(read<end) {
        int next=queue[read++], nx=next%width,ny=next/width;
        for(int py=Math.Max(0,ny-1);py<=Math.Min(height-1,ny+1);py++)
          for(int px=Math.Max(0,nx-1);px<=Math.Min(width-1,nx+1);px++) {
            int neighbor=py*width+px;
            if(labels[neighbor]!=0 || pixels[(top+py)*stride+(left+px)*4+3]<=20) continue;
            labels[neighbor]=component;
            queue[end++]=neighbor;
          }
      }
      if(end>bestSize){bestSize=end;best=component;}
    }
    if(best==0)return;
    for(int pos=0;pos<labels.Length;pos++) {
      if(labels[pos]==best)continue;
      int x=pos%width,y=pos/width;
      int alpha=(top+y)*stride+(left+x)*4+3;
      if(pixels[alpha]==0)continue;
      bool rim=false;
      if(labels[pos]==0)
        for(int py=Math.Max(0,y-2);py<=Math.Min(height-1,y+2);py++)
          for(int px=Math.Max(0,x-2);px<=Math.Min(width-1,x+2);px++)
            rim |= labels[py*width+px]==best;
      if(!rim)pixels[alpha]=0;
    }
  }
  public static void Prepare(string source,string destination,bool gridAnchor,bool rightFacingWalk,bool cleanTiles) {
    using(var image=new Bitmap(source)) {
      var bounds=new Rectangle[16]; int maxW=0,maxH=0;
      var data=image.LockBits(new Rectangle(0,0,image.Width,image.Height),cleanTiles?ImageLockMode.ReadWrite:ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);
      var pixels=new byte[Math.Abs(data.Stride)*image.Height]; Marshal.Copy(data.Scan0,pixels,0,pixels.Length);
      for(int n=0;n<16;n++) {
        int l=(n%4)*image.Width/4, r=(n%4+1)*image.Width/4;
        int t=(n/4)*image.Height/4,b=(n/4+1)*image.Height/4;
        if(cleanTiles) CleanTile(pixels,data.Stride,l,t,r-l,b-t);
        int x0=r,y0=b,x1=l,y1=t;
        for(int y=t;y<b;y++) for(int x=l;x<r;x++) if(pixels[y*data.Stride+x*4+3]>20) {
          x0=Math.Min(x0,x); x1=Math.Max(x1,x); y0=Math.Min(y0,y); y1=Math.Max(y1,y);
        }
        if(x1<x0 || y1<y0) throw new Exception("Empty sprite frame: "+n);
        bounds[n]=Rectangle.FromLTRB(Math.Max(l,x0-2),Math.Max(t,y0-2),Math.Min(r,x1+3),Math.Min(b,y1+3));
        maxW=Math.Max(maxW,bounds[n].Width); maxH=Math.Max(maxH,bounds[n].Height);
      }
      if(cleanTiles) Marshal.Copy(pixels,0,data.Scan0,pixels.Length);
      image.UnlockBits(data);
      const int tile=384;
      float scale=Math.Min(tile*.84f/maxW,tile*.84f/maxH);
      using(var output=new Bitmap(tile*4,tile*4,PixelFormat.Format32bppArgb)) using(var g=Graphics.FromImage(output)) {
        g.CompositingMode=System.Drawing.Drawing2D.CompositingMode.SourceCopy;
        g.InterpolationMode=System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
        for(int n=0;n<16;n++) {
          var b=bounds[n]; float w=b.Width*scale,h=b.Height*scale;
          // All frames share a fixed .9-tile floor and the same scale.
          float cellW=image.Width/4f;
          float dx=gridAnchor?(tile-cellW*scale)/2+(b.X-(n%4)*image.Width/4)*scale:(tile-w)/2;
          // The rightmost point is the muzzle for every profile walk frame.
          // Pin it horizontally so uneven tile placement cannot reverse a stride.
          if(rightFacingWalk) dx=(tile+maxW*scale)/2-w;
          g.DrawImage(image,new RectangleF((n%4)*tile+dx,(n/4)*tile+tile*.9f-h,w,h),b,GraphicsUnit.Pixel);
        }
        output.Save(destination,ImageFormat.Png);
      }
      Console.WriteLine("Prepared 16 aligned frames: "+destination);
    }
  }
}
'@ -ReferencedAssemblies System.Drawing.Common,System.Drawing.Primitives,System.Runtime.InteropServices,System.Private.Windows.Core,System.Private.Windows.GdiPlus,System.Console
[SpriteTiles]::Prepare($Source,$Destination,$GridAnchor.IsPresent,$RightFacingWalk.IsPresent,$CleanTiles.IsPresent)
