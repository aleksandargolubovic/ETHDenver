import React, { useState } from 'react';
import { Upload } from 'antd';
//import ImgCrop from 'antd-img-crop';

export default function UploadPhoto(props) {
  //const [fileList, setFileList] = useState([]);

  const onChange = ({ fileList: newFileList }) => {
    console.log("****************onchange****************")
    console.log(props.fileList)
    if (newFileList.length > 0 && newFileList.at(0).status != 'done') { newFileList.at(0).status = 'done'; }
    props.setFileList(newFileList);
  };

  const onPreview = async file => {
    let src = file.url;
    if (!src) {
      src = await new Promise(resolve => {
        const reader = new FileReader();
        reader.readAsDataURL(file.originFileObj);
        reader.onload = () => resolve(reader.result);
      });
    }
    const image = new Image();
    image.src = src;
    const imgWindow = window.open(src);
    imgWindow.document.write(image.outerHTML);
  };

  return (
    <Upload
      action="https://www.mocky.io/v2/5cc8019d300000980a055e76"
      listType="picture-card"
      fileList={props.fileList}
      onChange={onChange}
      onPreview={onPreview}
    >
      {props.fileList.length < 1 && '+ Upload'}
    </Upload>
  );
};

//ReactDOM.render(<Demo />, mountNode);