
import { Injectable } from '@angular/core';
import { NavController, Platform } from 'ionic-angular';
import { Http } from '@angular/http'
import { FileTransfer, FileUploadOptions, FileTransferObject } from '@ionic-native/file-transfer';
import { File } from "@ionic-native/file";
import { FileOpener } from '@ionic-native/file-opener';
import { AndroidPermissions } from '@ionic-native/android-permissions';

/*
  Generated class for the UpdateCheckerProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class UpdateCheckerProvider {

  public serverAdress = "";
  public currentVersion: string = "0.0.0";
  public latestVersion: string = "";

  private latestFileName: string = "";
  private percent: number = 0.0;

  constructor(private http: Http,
    private file: File, private fileOpener: FileOpener, private pl: Platform,
    private fileTransfer: FileTransfer, private ap: AndroidPermissions) {

  }

  private extractLatestVersion(versions: string[]): string {
    versions = versions.map(a => a.replace(/\d+/g, n => (+n + 100000).toString())).sort()
      .map(a => a.replace(/\d+/g, n => (+n - 100000).toString()));
    return versions[versions.length - 1];
  }

  private compareVersions(ver1: string, ver2: string): number {
    let v1 = ver1.trim().split('.');
    let v2 = ver2.trim().split('.');

    let length = v1.length >= v2.length ? v1.length : v2.length;
    for (let i = 0; i < length; i++) {

      let lh = i < v1.length ? v1[i] : 0;
      let rh = i < v2.length ? v2[i] : 0;

      if (lh > rh) {
        return 1;
      } else if (v1[i] < v2[i]) {
        return -1;
      }
      else {
        if (lh == rh && i == length - 1) {
          return 0;
        }
      }
    }
  }

  /**
   * 
   * @param needUpdate When version from server > than local (parameter newVersion)
   * @param upToDate When version from server <= than local
   * @param error 
   */
  public checkUpdates(needUpdate: (newVersion:string) => void, upToDate: () => void, error: (any) => void): void {

    this.ap.requestPermission(this.ap.PERMISSION.INTERNET)
      .then(() => {
        this.http.get(this.serverAdress + "/versions").toPromise()
          .then(resp => {
            let versions = resp.json();
            //console.log(JSON.stringify(versions));
            this.latestVersion = this.extractLatestVersion(versions.map(v => v.version));
            this.latestFileName = versions.find(v => v.version == this.latestVersion).filename;

            let comp = this.compareVersions(this.currentVersion, this.latestVersion);
            if (comp == 1 || comp == 0) {
              if (upToDate != null) {
                upToDate();
              }
            } else if (comp == -1) {
              if (needUpdate != null) {
                needUpdate(this.latestVersion);
              }
            }

          })
          .catch(err => {
            if (error != null) {
              error(err);
            }
            //console.log("HttpErr: " + err.toString());
          });
      })
      .catch(err => {
        if (error != null) {
          error(err);
        }
        //console.log("HttpErr: " + err.toString());
      });

  }


  update(onProgress: (number) => void, onFinished: () => void, onError: (any) => void) {

    this.ap.requestPermission(this.ap.PERMISSION.WRITE_EXTERNAL_STORAGE)
      .then(good => {
        let ft = this.fileTransfer.create();
        this.percent = 0.0;
        ft.onProgress(ev => {
          let total = ev.total;
          let current = ev.loaded;

          this.percent = Number.parseInt((current / total * 100).toFixed(0));
          if (onProgress != null) {
            onProgress(this.percent);
          }
        });

        let source = this.serverAdress + "/versions/" + this.latestVersion + "/";
        let target = this.file.externalRootDirectory + "Download/" + this.latestFileName;
        ft.download(source, target, true, { replace: true })
          .then(() => {
            //console.log("File downloaded!");
            if (onFinished != null) {
              onFinished();
            }
            this.fileOpener.open(target, "application/vnd.android.package-archive")
              .then(r => {
                //console.log("Opening file...");
              })
              .catch(err => {
                if (onError != null) {
                  onError(err);
                }
              });

          })
          .catch(err => {
            if (onError != null) {
              onError(err);
            }
          });
      })
      .catch(err => {
        if (onError != null) {
          onError(err);
        }
      });

  }




}
