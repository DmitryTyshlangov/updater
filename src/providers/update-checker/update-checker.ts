
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

  /*private extractLatestVersion(versions: string[]): string {
    versions = versions.map(a => a.replace(/\d+/g, n => (+n + 100000).toString())).sort()
      .map(a => a.replace(/\d+/g, n => (+n - 100000).toString()));
    return versions[versions.length - 1];
  }*/

  private compareVersions(ver1: string, ver2: string): number {
    let search = /\s*-\s*rc\s*/;
    let rc1 = ver1.match(search);
    let rc2 = ver2.match(search);

    let v1 = ver1.replace(search, "").trim().split('.');
    let v2 = ver2.replace(search, "").trim().split('.');

    let length = 3;
    for (let i = 0; i < length; i++) {

      let lh = v1[i];
      let rh = v2[i];

      if (lh > rh) {
        return 1;
      } else if (lh < rh) {
        return -1;
      }
      else {
        if (lh == rh && i == length - 1) {

          if (rc1 != null && rc2 == null) {
            return -1;
          } else if (rc1 == null && rc2 != null) {
            return 1;
          } else if (rc1 == null && rc2 == null) {
            return 0;
          } else if (rc1 != null && rc2 != null) {
            let lh4 = v1[length];
            let rh4 = v2[length];
            if (lh4 > rh4) {
              return 1;
            } else if (lh4 < rh4) {
              return -1;
            } else {
              return 0;
            }
          }
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
  public checkUpdates(needUpdate: (newVersion: string) => void, upToDate: () => void, error: (any) => void): void {

    this.ap.requestPermission(this.ap.PERMISSION.INTERNET)
      .then(() => {
        this.http.get(this.serverAdress + "/versions/latest").toPromise()
          .then(resp => {
            let obj = resp.json();
            console.log(JSON.stringify(obj));
            //this.latestVersion = this.extractLatestVersion(versions.map(v => v.version));
            this.latestFileName = "update" + obj.version;
            this.latestVersion = obj.version;

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
