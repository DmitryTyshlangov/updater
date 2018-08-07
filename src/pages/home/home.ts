import { Component } from '@angular/core';
import { File } from "@ionic-native/file";
import { Platform } from 'ionic-angular';
import { UpdateCheckerProvider } from "../../providers/update-checker/update-checker";

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  public percent: string = "0";

  public STATES = ["none", "old", "updating", "upToDate"];
  public state: string = "none";
  public isUpdateChecked: boolean = false;
  public showUpdating: boolean = false;
  public latestVersion: string = "";
  public currentVersion: string = "";

  constructor(private updater: UpdateCheckerProvider, private file: File, private pl: Platform) {
    updater.serverAdress = "http://192.168.1.36:8001";
    updater.currentVersion = "0.0.0";

    pl.ready().then(d => {

      let path = this.file.externalDataDirectory;

      this.file.readAsText(path, "data.txt")
        .then(data => {
          updater.currentVersion = data;
          this.currentVersion = data;
          console.log("Latest local version: " + data);
          updater.checkUpdates(this.onNeedUpdate, this.onUpToDate, this.onError);
        })
        .catch(err => {
          console.log("Err: " + JSON.stringify(err));
          updater.currentVersion = "0.0.0";
          this.currentVersion = "0.0.0";
          console.log("Latest local version: 0.0.0");
          updater.checkUpdates(this.onNeedUpdate, this.onUpToDate, this.onError);
        });

    });
  }

  public update() {
    this.showUpdating = true;
    this.state = "updating";
    console.log("Start downloading...");
    this.updater.update(this.onProgress, this.onFinish, this.onError);
  }

  onProgress = (p: number) => {
    this.percent = p + "%";
  }

  onFinish = () => {
    this.state = "upToDate";
    this.updater.currentVersion = this.updater.latestVersion;

    this.currentVersion = this.updater.currentVersion;
    this.latestVersion = this.updater.latestVersion;
    this.saveToDataFile(this.updater.currentVersion);
  }

  onNeedUpdate = (newVersion:string) => {
    this.isUpdateChecked = true;
    this.state = "old";
    this.latestVersion = newVersion;
  }
  onUpToDate = () => {
    this.isUpdateChecked = true;
    this.state = "upToDate";
  }
  onError = (err: any) => {
    this.state = "none";
    this.showUpdating = false;
    this.isUpdateChecked = false;
    console.log("Err: " + err.toString() + " this = " + this);
  }

  private saveToDataFile(val: string): void {
    this.file.writeFile(this.file.externalDataDirectory, "data.txt", val, { replace: true })
      .then(() => {
        console.log("New version saved!");
      })
      .catch(err => {
        console.log("Err: " + JSON.stringify(err));
      });
  }
}

