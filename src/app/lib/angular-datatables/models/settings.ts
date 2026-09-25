/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://raw.githubusercontent.com/l-lin/angular-datatables/master/LICENSE
 */

export interface ADTSettings {
  [key: string]: any;
  columns?: ADTColumns[];
  rowCallback?: (row: any, data: any, index: number) => void;
}

export interface ADTColumns {
  [key: string]: any;
  visible?: boolean;
  id?: string;
  ngPipeInstance?: any;
  ngTemplateRef?: any;
  ngPipeArgs?: any[];
}
