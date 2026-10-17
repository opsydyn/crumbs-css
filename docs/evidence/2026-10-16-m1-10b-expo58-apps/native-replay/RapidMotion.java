import maestro.*;
import maestro.android.AndroidDeviceConnection;
import maestro.drivers.*;
import maestro.utils.NoOpMetrics;
import com.google.gson.Gson;
import java.nio.file.*;
import java.util.*;
import java.util.regex.*;

public class RapidMotion {
  static AndroidDriver driver;
  static final Gson gson=new Gson();
  static TreeNode find(TreeNode root,String id){
    if(id.equals(root.getAttributes().get("resource-id")))return root;
    for(TreeNode c:root.getChildren()){TreeNode found=find(c,id);if(found!=null)return found;}
    return null;
  }
  static Point point(TreeNode root,String id){
    TreeNode node=Objects.requireNonNull(find(root,id),"Missing native control: "+id);
    Matcher m=Pattern.compile("\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]").matcher(node.getAttributes().get("bounds"));
    if(!m.matches())throw new IllegalStateException("Invalid native bounds");
    return new Point((Integer.parseInt(m.group(1))+Integer.parseInt(m.group(3)))/2,(Integer.parseInt(m.group(2))+Integer.parseInt(m.group(4)))/2);
  }
  static void click(String id)throws Exception{driver.tap(point(driver.contentDescriptor(false),id));Thread.sleep(150);}
  static void retain(Path out,String name)throws Exception{
    Files.writeString(out.resolve(name+".json"),gson.toJson(driver.contentDescriptor(false)));
    try(okio.Sink sink=okio.Okio.sink(out.resolve(name+".png").toFile())){driver.takeScreenshot(sink,false);}
  }
  static void reset()throws Exception{click("motion-duration-zero");click("motion-a-rest");click("motion-duration-normal");}
  public static void main(String[] args)throws Exception{
    Path out=Path.of(args[0]);Files.createDirectory(out);
    var connection=AndroidDeviceConnection.Companion.open("127.0.0.1",5581,7009);
    if(!connection.getSerial().equals("127.0.0.1:5581"))throw new IllegalStateException("Foreign Android device: "+connection.getSerial());
    if(!connection.shell("getprop ro.kernel.qemu").getOutput().trim().equals("1"))throw new IllegalStateException("Not an emulator");
    driver=new AndroidDriver(connection,"crumbs_m110b",false,new NoOpMetrics(),new LocaleRetryPolicy(),10000L);
    try{
      driver.installMaestroDriverApp();driver.open();
      reset();TreeNode root=driver.contentDescriptor(false);Point select=point(root,"motion-a-select"),cancel=point(root,"motion-a-cancel");
      long start=System.nanoTime();driver.tap(select);Thread.sleep(200);driver.tap(cancel);long elapsed=(System.nanoTime()-start)/1000000;
      Files.writeString(out.resolve("cancel-input.json"),gson.toJson(Map.of("device",connection.getSerial(),"select",select,"cancel",cancel,"elapsedMs",elapsed,"durationMs",5000)));
      if(elapsed>=4000)throw new IllegalStateException("Native input sequence too slow: "+elapsed);
      Thread.sleep(150);retain(out,"cancel");
      String text=Objects.requireNonNull(find(driver.contentDescriptor(false),"motion-observations")).getAttributes().get("text");
      if(!text.contains("cancelled"))throw new IllegalStateException("Native terminal did not cancel: "+text);
      reset();root=driver.contentDescriptor(false);select=point(root,"motion-a-select");Point unmount=point(root,"motion-a-unmount");
      start=System.nanoTime();driver.tap(select);Thread.sleep(200);driver.tap(unmount);elapsed=(System.nanoTime()-start)/1000000;
      Files.writeString(out.resolve("unmount-input.json"),gson.toJson(Map.of("device",connection.getSerial(),"select",select,"unmount",unmount,"elapsedMs",elapsed,"durationMs",5000)));
      if(elapsed>=4000)throw new IllegalStateException("Native unmount sequence too slow: "+elapsed);
      Thread.sleep(150);retain(out,"unmount");
      if(find(driver.contentDescriptor(false),"motion-a-select")!=null||find(driver.contentDescriptor(false),"motion-b-select")==null)throw new IllegalStateException("Wrong native owner lifetime");
      TreeNode unmounted=driver.contentDescriptor(false);
      String before=Objects.requireNonNull(find(unmounted,"motion-observations")).getAttributes().get("text");
      Thread.sleep(5200);retain(out,"after-retired-deadline");
      String after=Objects.requireNonNull(find(driver.contentDescriptor(false),"motion-observations")).getAttributes().get("text");
      if(!before.equals(after))throw new IllegalStateException("Retired owner published after its original deadline");
      System.out.println("Native Maestro driver: cancellation, unmount and retired deadline passed");
    }finally{driver.close();connection.close();}
  }
}
